'use strict';

/**
 * The absolute max number of on-screen tiles with video.
 * The video bridge enforces a limit of 24 streams relay to any endpoint.
 */
export const MAX_ONSCREEN_TILES = 25;
const MAX_TILES_GRID_SIZE = Math.sqrt(MAX_ONSCREEN_TILES);

/**
 * The default width of a tile in the sidebar.
 * This controls the minimal width of the sidebar.
 */
export const DEFAULT_TILE_WIDTH = 200;
export const DEFAULT_TILE_AR = 3 / 2;

/**
 * @param {Object} args
 * @param {number} args.percentX
 * @param {number} args.pixelY
 * @param {number=} args.maxAR the max tile AR (default 2:1)
 */
const _tileSize = ({ percentX, pixelY, maxAR = 2 }) => ({
  width: `${Math.floor(percentX * 10) / 10}%`,
  height: `${pixelY}px`,
  maxWidth: `${maxAR * pixelY}px`
});

/**
 * @param {HTMLElement} container
 */
export const getSidebarMaxTiles = container => {
  if (container) {
    const { clientWidth, clientHeight } = container;
    const maxColumns = Math.min(
      MAX_TILES_GRID_SIZE,
      Math.max(1, Math.floor(clientWidth / DEFAULT_TILE_WIDTH))
    );
    // ideal height under default AR
    const tileHeight = DEFAULT_TILE_WIDTH / DEFAULT_TILE_AR;
    return {
      maxColumns,
      total: Math.min(
        MAX_ONSCREEN_TILES,
        Math.max(1, Math.floor(clientHeight / tileHeight) * maxColumns)
      )
    };
  }
  return null;
};

/**
 * Gallery Tile Size Calculator
 * Determines how to size n tiles relative to their container,
 * optimizing for both tile aspect ratio and screen coverage.
 *
 * @param {Object} arg
 * @param {number} arg.n number of tiles.
 * @param {HTMLElement=} arg.container the container around the tiles. Must have clientHeight and clientWidth properties
 * @param {number=} arg.minTileAspectRatio the lower limit of the tile aspect ratio (e.g. 16:9 = 16/9 ~= 1.77)
 * @param {number=} arg.maxColumns the upper limit of the columns
 */
export const galleryModeTileSize = ({
  n,
  container,
  minTileAspectRatio,
  maxColumns
}) => {
  if (!container || n <= 0) {
    return _tileSize({ percentX: 0, pixelY: 0 });
  }

  const { clientWidth, clientHeight } = container;
  const containerAR = clientWidth / clientHeight;

  // Determine the ideal blend of rows and columns by comparing tile and container aspects
  const idealColumnToRowRatio = containerAR / minTileAspectRatio;

  maxColumns = maxColumns > 0 ? maxColumns : 0;

  // The upper limit of the tile aspect ratio, used as a constraint comparing tile area
  const maxTileAspectRatio = maxColumns ? 1.85 : 2;

  const { pixelY, columns } = [
    determineColumns({
      n,
      idealColumnToRowRatio,
      singleRowRatioThreshold: maxTileAspectRatio * 2
    })
  ]
    .flatMap(c => c)
    .map(c =>
      defineTile({
        n,
        minTileAspectRatio,
        maxTileAspectRatio,
        clientWidth,
        clientHeight,
        columns: maxColumns ? Math.min(maxColumns, c) : c
      })
    )
    .sort(
      (a, b) =>
        // prefer larger tile size
        b.area - a.area ||
        // for the same size, prefer more columns
        b.columns - a.columns
    )
    .find(Boolean);

  return _tileSize({
    percentX: (1 / columns) * 100,
    pixelY,
    maxAR: maxTileAspectRatio
  });
};

const defineTile = ({
  n,
  minTileAspectRatio,
  maxTileAspectRatio,
  clientWidth,
  clientHeight,
  columns
}) => {
  const rows = Math.ceil(n / columns);

  // Fill available x space completely
  const _pixelX = Math.floor(clientWidth / columns);

  // Apply aspect ratio to x to determine y.
  const idealY = _pixelX / minTileAspectRatio;
  // Constrain y to ensure that tiles aren't taller than the screen after filling x space
  // For example for n=1 in a container wider than tile aspect.
  const constrainedY = clientHeight / rows;
  const pixelY = Math.min(idealY, constrainedY);
  const pixelX = Math.min(pixelY * maxTileAspectRatio, _pixelX);
  return {
    pixelX,
    pixelY,
    columns,
    area: pixelX * pixelY
  };
};

/**
 * @param {Object} args
 * @param {number} args.n
 * @param {number} args.idealColumnToRowRatio
 * @param {number} args.singleRowRatioThreshold
 */
const determineColumns = ({
  n,
  idealColumnToRowRatio,
  singleRowRatioThreshold
}) => {
  // if there is one tile, fill the screen regardless of aspect ratio
  if (n === 1) {
    return 1;
  }

  // if there are 2 tiles, prefer single column if tile AR < container AR
  if (n === 2) {
    return idealColumnToRowRatio > 1 ? 2 : 1;
  }

  // Given rows = columns / i (ideal column:row ratio)
  // Given r * c >= n (we need enough spaces for all tiles to fit)
  // c² / i >= n (by substitution)
  // c² >= n * i
  // c >= sqrt(n * i)
  const c = Math.max(1, Math.floor(Math.sqrt(n * idealColumnToRowRatio)));

  const candidates = [
    // if n is square, maybe use square layout
    [4, 9, 16, 25].includes(n) ? Math.sqrt(n) : 0,
    // ultra wide, maybe use single row
    idealColumnToRowRatio >= singleRowRatioThreshold ? n : 0,
    // apply larger tile AR
    c,
    // apply smaller tile AR
    c + 1
  ].filter(c => c > 0);

  return Array.from(new Set(candidates));
};
