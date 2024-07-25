document.addEventListener("DOMContentLoaded", async (event) => {
  const uploadBtn = document.querySelector(".upload-btn");
  const likeBtn = document.querySelector(".like-btn");
  const imageUploadInput = document.getElementById("image-upload");
  const slideshowContainer = document.querySelector(".slideshow .carousel-inner");

  uploadBtn.addEventListener("click", () => {
    imageUploadInput.click();
  });
  
  likeBtn.addEventListener("click", async () => {
    const img = slideshowContainer.querySelector('.active img');
    like(img.dataset.key);
    const count = Number(img.dataset.like) + 1;
    showLike(count);
    img.setAttribute('data-like', count);
    
    const increaseEffect = document.createElement('div');
    increaseEffect.classList.add('like-count', 'increase');
    increaseEffect.textContent = `+ ${count}`
    slideshowContainer.append(increaseEffect);
    setTimeout(() => {
      increaseEffect.remove();
    }, 400)
  })
  
  $('.carousel').on('slid.bs.carousel', function () {
    const img = this.querySelector('.active img');
    showLike(img.dataset.like);
  })
  
  $('.carousel').on('slide.bs.carousel', function () {
    hideLike()
  })
  
  async function fetchImages() {
    const objects = await fetch('https://like-machine.liukebin.cn/').then((res) => res.json());

    objects.forEach((v) => {
      pushImage(v.key, v.meta.like);
    });
  }
  
  async function fetchLike(key) {
    return fetch(`https://like-machine.liukebin.cn/${key}/like`).then((res) => res.json())
  }
  
  async function like(key) {
    return fetch(`https://like-machine.liukebin.cn/${key}/like`, {
      method: "POST"
    })
  }
  
  function showLike(count) {
    let likeCount = slideshowContainer.querySelector('.like-count');
    if (!likeCount) {
      likeCount = document.createElement('div');
      likeCount.classList.add('like-count');
      slideshowContainer.append(likeCount);
    }
    likeCount.textContent = `点赞数: ${count}`;
  }
  
  function hideLike() {
    const likeCount = slideshowContainer.querySelector('.like-count');
    if (likeCount) {
      likeCount.remove();
    }
  }

  function pushImage(key, like) {
    const img = document.createElement("img");
    img.src = `https://r2-like-machine.liukebin.cn/${key}`;
    img.alt = key;
    img.setAttribute('data-like', like);
    img.setAttribute('data-key', key);
    img.classList.add("d-block", "w-100");

    const item = document.createElement("div");
    item.classList.add("carousel-item");
    item.append(img);

    slideshowContainer.append(item);
  }

  function activeSlideshow() {
    const items = slideshowContainer.querySelectorAll(".carousel-item");
    if (items.length > 0) {
      items[items.length - 1].classList.add("active");
      const img = slideshowContainer.querySelector('.active img');
      showLike(img.dataset.like);
    }
  }

  imageUploadInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
      let uuid = self.crypto.randomUUID();
      await fetch(`https://like-machine.liukebin.cn/${uuid}`, {
        method: "POST",
        body: files[i]
      });
      pushImage(`images/${uuid}`, 0);
    }
  });

  await fetchImages();
  activeSlideshow();
});