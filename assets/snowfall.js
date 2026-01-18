window.Snowfall = {
  start(opts) {
    if (!opts) {
      return;
    }

    const flakes = Number(opts.flakes);
    const seconds = Number(opts.seconds);
    const mode = opts.mode;

    if (!flakes || !seconds) {
      return;
    }

    if (mode === "once_per_session") {
      try {
        if (sessionStorage.getItem("shawqSnowShown") === "1") {
          return;
        }
        sessionStorage.setItem("shawqSnowShown", "1");
      } catch (error) {
        // Ignore storage errors.
      }
    }

    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    canvas.style.opacity = "1";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    let viewWidth = window.innerWidth;
    let viewHeight = window.innerHeight;

    const updateCanvasSize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      viewWidth = window.innerWidth;
      viewHeight = window.innerHeight;
      flakesList.forEach((flake) => {
        flake.x = Math.min(Math.max(flake.x, -8), viewWidth + 8);
        flake.y = Math.min(Math.max(flake.y, -8), viewHeight + 8);
      });
    };

    const flakesList = [];
    const countSmall = Math.floor(flakes * 0.6);
    const countMedium = Math.floor(flakes * 0.3);
    const countLarge = flakes - countSmall - countMedium;

    const randomBetween = (min, max) => min + Math.random() * (max - min);

    const createFlake = (radius) => {
      let alpha = 0.22;
      let blur = 0;

      if (radius === 1) {
        alpha = randomBetween(0.18, 0.3);
        blur = 0;
      } else if (radius === 2) {
        alpha = randomBetween(0.22, 0.38);
        blur = randomBetween(0.6, 1.0);
      } else {
        alpha = randomBetween(0.28, 0.45);
        blur = randomBetween(0.9, 1.4);
      }

      return {
        x: randomBetween(0, viewWidth),
        y: randomBetween(-viewHeight, 0),
        r: radius,
        vy: randomBetween(0.35, 1.25),
        drift: randomBetween(-0.2, 0.2),
        alpha,
        blur,
      };
    };

    for (let i = 0; i < countSmall; i += 1) {
      flakesList.push(createFlake(1));
    }
    for (let i = 0; i < countMedium; i += 1) {
      flakesList.push(createFlake(2));
    }
    for (let i = 0; i < countLarge; i += 1) {
      flakesList.push(createFlake(3));
    }

    updateCanvasSize();

    let startTime = null;
    let fadeStartTime = null;
    let rafId = null;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      if (elapsed >= seconds * 1000 && !fadeStartTime) {
        fadeStartTime = timestamp;
      }

      ctx.clearRect(0, 0, viewWidth, viewHeight);

      flakesList.forEach((flake) => {
        flake.y += flake.vy;
        flake.x += flake.drift;

        if (flake.y > viewHeight + 8) {
          flake.y = -8;
          flake.x = randomBetween(0, viewWidth);
        }
        if (flake.x < -8) {
          flake.x = viewWidth + 8;
        }
        if (flake.x > viewWidth + 8) {
          flake.x = -8;
        }

        ctx.save();
        ctx.shadowColor = `rgba(255,255,255,${flake.alpha * 0.35})`;
        ctx.shadowBlur = flake.blur;
        ctx.fillStyle = `rgba(255,255,255,${flake.alpha})`;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (fadeStartTime) {
        const fadeElapsed = timestamp - fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / 900, 1);
        canvas.style.opacity = String(1 - fadeProgress);
        if (fadeProgress >= 1) {
          cleanup();
          return;
        }
      }

      rafId = window.requestAnimationFrame(animate);
    };

    const cleanup = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", updateCanvasSize);
      canvas.remove();
    };

    window.addEventListener("resize", updateCanvasSize);
    rafId = window.requestAnimationFrame(animate);
  },
};
