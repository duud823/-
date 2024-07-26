/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
interface Object {
    id: string;
	key: string;
	meta: Meta;
}

interface Meta {
	like: number;
}

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
	"Access-Control-Max-Age": "86400",
};

function objectNotFound(objectName: string): Response {
  return new Response(`<html><body>R2 object "<b>${objectName}</b>" not found</body></html>`, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=UTF-8'
    }
  })
}

async function getMeta(id: string, env: Env): Promise<Meta | undefined> {
	const metaObject = await env.MY_BUCKET.get(`metadata/${id}.meta.json`);
	return metaObject?.json<Meta>();
}

function updateMeta(id: string, meta: Meta, env: Env): Promise<R2Object> {
	return env.MY_BUCKET.put(`metadata/${id}.meta.json`, JSON.stringify(meta), {
		httpMetadata: {
			contentType: "application/json"
		}
	})
}

async function list(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const options: R2ListOptions = {
		prefix: "images/",
		delimiter: url.searchParams.get('delimiter') ?? undefined,
		cursor: url.searchParams.get('cursor') ?? undefined,
		include: ['customMetadata', 'httpMetadata'],
	}
	console.log(JSON.stringify(options))

	const listing = await env.MY_BUCKET.list(options)
	const data: Object[] = [];
	for (let i in listing.objects) {
		const object = listing.objects[i];
		if (object.key === options.prefix) {
			continue;
		}
        const id = object.key.split('/')[1]
		const metaData = await getMeta(id, env)
		data.push({id: id, key: object.key, meta: metaData!})
	}
	
	return new Response(JSON.stringify(data), {
		headers: {
			...corsHeaders,
			'content-type': 'application/json; charset=UTF-8',
		}
	})
}

async function upload(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const id = url.pathname.slice(1)
	const object = await env.MY_BUCKET.put(`images/${id}`, request.body, {
		httpMetadata: request.headers,
	})

	await updateMeta(id, { like: 0 }, env)

	return new Response(null, {
		headers: {
			...corsHeaders,
			'etag': object.httpEtag,
		}
	})
}

async function addLike(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const id = url.pathname.slice(1).split('/')[0];
	let metaData = await getMeta(id, env);
	if (metaData){
		metaData.like++;
	} else {
		metaData = { like: 1 };
	}
	await updateMeta(id, metaData, env);
	return new Response(null, {
		headers: {...corsHeaders}
	})
}

async function getLike(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const id = url.pathname.slice(1).split('/')[0];
	const metaData = await getMeta(id, env);

	return new Response(JSON.stringify(metaData), {
		headers: {
			...corsHeaders,
		}
	})
}

async function uploader(request: Request, env: Env): Promise<Response> {
    const object = await env.MY_BUCKET.get('uploader.html');

	return new Response(await object?.text(), {
		headers: {
			...corsHeaders,
            'content-type': 'text/html; charset=UTF-8',
		}
	})
}

async function album(request: Request, env: Env): Promise<Response> {
    const object = await env.MY_BUCKET.get('album.html');

	return new Response(await object?.text(), {
		headers: {
			...corsHeaders,
            'content-type': 'text/html; charset=UTF-8',
		}
	})
}

interface Route {
	pattern: RegExp,
	handler: (request: Request, env: Env) => Promise<Response>,
	method: string,
}

const routes: Route[] = [
	{pattern: /^\/([^\/]+)\/like$/, handler: addLike, method: 'POST'},
	{pattern: /^\/([^\/]+)\/like$/, handler: getLike, method: 'GET'},
	{pattern: /^\/([^\/]+)$/, handler: upload, method: 'POST'},
	{pattern: /^\/$/, handler: list, method: 'GET'},
	{pattern: /^\/uploader$/, handler: uploader, method: 'GET'},
	{pattern: /^\/album$/, handler: album, method: 'GET'},
]

async function handleOptions(request: Request) {
	if (
		request.headers.get("Origin") !== null &&
		request.headers.get("Access-Control-Request-Method") !== null &&
		request.headers.get("Access-Control-Request-Headers") !== null
	) {
		// Handle CORS preflight requests.
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",      
				"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
				"Access-Control-Max-Age": "86400",
				"Access-Control-Allow-Headers": request.headers.get(
					"Access-Control-Request-Headers"
				),
			},
		});
	} 

	// Handle standard OPTIONS request.
	return new Response(null, {
		headers: {
			Allow: "GET, HEAD, POST, OPTIONS",
		},
	});
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

		if (request.method == 'OPTIONS') {
			return handleOptions(request);
		}

		for (const route of routes) {
			const match = url.pathname.match(route.pattern)
			if (match) {
				if (request.method !== route.method) {
					continue;
				}
				return route.handler(request, env)
			}
		}

		return new Response(`Not found`, {status: 404});
  }
} satisfies ExportedHandler<Env>;
