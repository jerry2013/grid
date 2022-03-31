import { galleryModeTileSize } from "./modules/tileSizeCalculator.js";

window.onload = () => {
  const callView = document.getElementById("call-view");

  const form = document.querySelector("form");

  const container = document.querySelector("ul");

  const draw = (n) => {
    if (n !== container.childElementCount) {
      container.innerHTML = "";
      for (let i = 1; i <= n; i++) {
        container.appendChild(document.createElement("li"));
      }
    }
  };

  const format = (n) => (Math.round(1e3 * n) / 1e3).toFixed(3);
  const getInfo = () => {
    if (container.childElementCount) {
      const { clientWidth: viewWidth, clientHeight: viewHeight } = callView;
      const { clientWidth, clientHeight } = container;
      const { clientWidth: tileWidth, clientHeight: tileHeight } =
        container.firstChild;
      callView.setAttribute(
        "data-info",
        [
          `Viewport=${viewWidth}x${viewHeight}`,
          `Box=${clientWidth}x${clientHeight}`,
          `BoxAR=${format(clientWidth / clientHeight)}`,
          `TileAR=${format(tileWidth / tileHeight)}`,
        ].join(" ")
      );
    }
    requestAnimationFrame(getInfo);
  };
  getInfo();

  const refresh = _.throttle(
    () => {
      const { width, height, maxWidth } = galleryModeTileSize({
        n: form.n.valueAsNumber,
        container,
        minTileAspectRatio: form.ar.valueAsNumber,
        idealAR: form.ar.valueAsNumber,
        maxColumns: form.columns.valueAsNumber,
      });

      // container.setAttribute("data-ar", `TileAR=${format(idealAR)} (${columns})`);
      container.style.setProperty("--tileW", width);
      container.style.setProperty("--tileH", height);
      container.style.setProperty("--tileMaxW", maxWidth);

      draw(form.n.valueAsNumber);
    },
    100,
    {
      leading: false,
    }
  );

  document
    .getElementById("args")
    .querySelectorAll("input, select")
    .forEach((el) => (el.onchange = refresh));

  const setResolution = () => {
    let [width, height] = form.resolution.value.split(/\D/).filter(Boolean);
    if (width && height) {
      if (!form.orientation.checked) {
        [width, height] = [height, width];
      }
      Object.assign(callView.style, {
        width: width + "px",
        height: height + "px",
      });

      refresh();
    }
  };

  document
    .getElementById("res")
    .querySelectorAll("input, select")
    .forEach((el) => (el.onchange = setResolution));

  setResolution();
  refresh();

  interact(callView).resizable({
    edges: { left: false, right: true, bottom: true, top: false },
    listeners: {
      move({ target = document.body, rect }) {
        const { width, height } = rect;
        const { style } = target;
        // update the element's style
        Object.assign(style, {
          width: `${Math.max(200, width)}px`,
          height: `${height}px`,
        });
        form.resolution.value = "";
        refresh();
      },
    },
  });
};
