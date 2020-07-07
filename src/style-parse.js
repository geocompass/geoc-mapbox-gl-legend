'use strict';
const BASEDPI = 96;
module.exports = {
  legendResolveStyle(style, layerIDs, spriteJSON, dpi = 96) {
    const legendData = [];
    const idMapJson = this.convertIdMap(style.metadata.layerIDMap);
    for (const layer of style.layers) {
      if (layerIDs.includes(layer.id)) {
        if (layer.type === 'symbol') {
          const symbolLegend = this.parseSymbol(layer, spriteJSON, idMapJson, dpi);
          if (symbolLegend) { legendData.push(symbolLegend); }
        } else if (layer.type === 'line') {
          const lineLegend = this.parseLine(layer, idMapJson, dpi);
          if (lineLegend) { legendData.push(lineLegend); }
        } else if (layer.type === 'fill') {
          const fillLegend = this.parseFill(layer, idMapJson, dpi);
          if (fillLegend) { legendData.push(fillLegend); }
        }
      }
    }
    return legendData;
  },
  parseSymbol(symbolLayer, spriteJSON, layerIdMap, dpi) {
    const result = {
      txt: layerIdMap[symbolLayer.id],
      icon: '',
      width: 0,
      height: 0,
      left: 0,
      top: 0,
      type: 'symbol',
    };
    if (symbolLayer.layout.hasOwnProperty('icon-image') && symbolLayer.layout['icon-image'] !== '' && this.checkLayoutVisibility(symbolLayer)) {
      const layout = symbolLayer.layout;
      result.icon = layout['icon-image'];
      result.left = spriteJSON[result.icon].x;
      result.top = spriteJSON[result.icon].y;
      result.width = spriteJSON[result.icon].width;
      result.height = spriteJSON[result.icon].height;
      result.legendWidth = Math.ceil(15 * dpi / BASEDPI);
      result.legendHeight = Math.ceil(15 * dpi / BASEDPI);
      return result;
    }
  },
  parseLine(lineLayer, layerIdMap, dpi) {
    const result = {
      txt: layerIdMap[lineLayer.id],
      width: Math.ceil(15 * dpi / BASEDPI),
      height: 0,
      color: '',
      opacity: 1,
      type: 'line',
    };
    if (this.checkLayoutVisibility(lineLayer)) {
      const paint = lineLayer.paint;
      result.height = Math.ceil((paint['line-width'] || 2) * dpi / BASEDPI);
      result.color = paint['line-color'] || '#000';
      result.opacity = paint['line-opacity'] || 1;
      return result;
    }
  },
  parseFill(fillLayer, layerIdMap, dpi) {
    const result = {
      txt: layerIdMap[fillLayer.id],
      width: Math.ceil(15 * dpi / BASEDPI),
      height: Math.ceil(15 * dpi / BASEDPI),
      color: '',
      opacity: 1,
      outLinecolor: '',
      type: 'fill',
    };
    if (this.checkLayoutVisibility(fillLayer)) {
      const paint = fillLayer.paint;
      result.color = paint['fill-color'] || '#000';
      result.opacity = paint['fill-opacity'] || 1;
      result.outLinecolor = paint['fill-outline-color'] || '#000';
      return result;
    }
  },

  convertIdMap(layerIdMap) {
    const idMapJson = {};
    for (const key in layerIdMap) {
      for (const id of layerIdMap[key]) {
        idMapJson[id] = key;
      }
    }
    return idMapJson;
  },
  checkLayoutVisibility(layer) {
    if (layer.layout && layer.layout.visibility && layer.layout.visibility !== 'visible') return false;
    return true;
  },
};
