'use strict';
const parseStyle = require('./style-parse');
const HttpFetch = require('./util/http-fetch');
const { fabric } = require('fabric');
const BaseUtil = require('./base-util');
const BASEDPI = 96;
class MapboxglLegend extends BaseUtil {
  /**
     * 生成mapboxgl样式的图例
     * @param {Canvas} canvas dom
     * @param {*} style 样式URL或者样式JSON
     * @param {Array|String} showLayer 需要展示的图层ID
     * @param {Object} options 配置项
     * @param {Number} options.rowMargin 每行之间距离
     * @param {Number} options.columnMargin 每列之间距离
     * @param {Number} options.fontSize 图例中每个图层的文字大小
     * @param {Number} options.tuliFontSize “图例” 文字大小
     * @param {Number} options.tuliLegendMargin “图例” 文字与第一组图例的距离大小
     * @param {Number} options.iconTextMargin 单组图例中，图标与文字的距离
     */
  constructor(canvas, style, showLayer, {
    columns = 2,
    padding = { top: 10, right: 15, bottom: 0, left: 15 },
    rowMargin = 10,
    columnMargin = 20,
    fontSize = 18,
    tuliFontSize = 20,
    dpi = 96,
    // symbolImgWidth = 15,
    // symbolImgHeight = 15,
    iconTextMargin = 5,
    tuliLegendMargin = 15,
  } = {}) {
    super();
    this.legendOptions = {
      columns,
      fontSize: Math.round(fontSize * dpi / BASEDPI),
      tuliFontSize: Math.round(tuliFontSize * dpi / BASEDPI),
      // symbolImgWidth: Math.round(symbolImgWidth * dpi / BASEDPI),
      // symbolImgHeight: Math.round(symbolImgHeight * dpi / BASEDPI),
      dpi,
      rowMargin,
      columnMargin,
      padding,
      iconTextMargin,
      tuliLegendMargin,
    };
    this.showLayer = showLayer; // 如果没有传则全部图层生成图例
    this.style = style;
    this.canvas = canvas;
  }
  async init() {
    const styleJSON = await HttpFetch.get(this.style);
    if (!styleJSON) {
      console.error('获取style失败！');
      return;
    }
    // 对于未传ID的，图例显示全部
    if (!this.showLayer) {
      this.showLayer = [];
      for (const layerName in styleJSON.metadata.layerIDMap) {
        if (layerName !== '背景') {
          this.showLayer = [ ...this.showLayer, ...styleJSON.metadata.layerIDMap[layerName] ];
        }
      }
    }

    const spriteJSON = await HttpFetch.get(styleJSON.sprite + '.json');
    if (!spriteJSON) return;
    this.legendOptions.imgURL = styleJSON.sprite + '.png';
    this.legendData = parseStyle.legendResolveStyle(styleJSON, this.showLayer, spriteJSON, this.legendOptions.dpi);
    // const WH = this.calculateWH();
    this.width = 0;
    this.height = 0;
    this.initCanvas();
    await this.drawLegend();
    this.drawBorder();
    // 宽高加4个像素，防止边界不显示
    this.legendLayer.fabricCanvas.setWidth(this.width + 4);
    this.legendLayer.fabricCanvas.setHeight(this.height + 4);
    return {
      width: this.width + 4,
      height: this.height + 4,
    };
    // this.legendLayer.fabricCanvas.renderAll();
    // return this.legendLayer.canvas;
  }
  initCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.legendLayer = {
      canvas: this.canvas,
      ctx: this.canvas.getContext('2d'),
      fabricCanvas: new fabric.Canvas(this.canvas),
    };
  }
  drawBorder() {
    // this.legendLayer.ctx;
    this.legendLayer.fabricCanvas.insertAt(new fabric.Rect({
      top: 0,
      left: 0,
      width: this.width,
      height: this.height,
      fill: '#fff',
      stroke: 'black',
    }), 0);
    // 调整图例两个字的位置
    this.tuliText.left = (this.width - this.tuliText.width) / 2;
  }
  async drawLegend() {
    // 一列一列的画
    const columnNum = this.legendOptions.columns;
    // 每列有几个，即时行数
    const num = Math.ceil(this.legendData.length / columnNum);
    // 图例文字的高度
    // const tuliTextHeight = this.legendOptions.tuliFontSize;
    // 绘制”图例“两个字
    this.tuliText = new fabric.IText('图例', {
      left: 0,
      top: this.legendOptions.padding.top,
      // fontFamily,
      fontSize: this.legendOptions.tuliFontSize,
      // fill: iconColor,
    });
    this.legendLayer.fabricCanvas.add(this.tuliText);
    let currentColumn = 0;
    let left = this.legendOptions.padding.left;
    let top = this.tuliText.height + this.legendOptions.padding.top;
    let legendMaxWidth = 0;
    let legendMaxHeight = 0;
    // const tempSumHeight = 0;
    // const tempSumWidth = 0;
    let currentRow = 0;
    for (let i = 0; i < this.legendData.length; ++i) {
      ++currentRow;
      let legendWH = {
        width: 0,
        height: 0,
      };
      // 换到第二列后重新计算left值
      if (Math.ceil((i + 1) / num) > currentColumn) {
        currentColumn = Math.ceil((i + 1) / num);
        if (currentColumn > 1) {
          left = left + legendMaxWidth + this.legendOptions.columnMargin;
        }
        // this.width += legendMaxWidth;
        // this.height += legendMaxWidth;
        legendMaxWidth = 0;
        legendMaxHeight = 0;
        currentRow = 1;
        top = this.legendOptions.padding.top + this.tuliText.height + this.legendOptions.tuliLegendMargin;
        // tempSumHeight = 0;
        // tempSumWidth = 0;
      }
      // const currentRow = (i + 1) - (currentColumn - 1) * num;
      if (currentRow > 1) top = top + this.legendOptions.rowMargin + legendMaxHeight;
      const legend = this.legendData[i];

      switch (legend.type) {
        case 'symbol': {
          legendWH = await this.drawSymbolLegend(legend, left, top);
          break;
        }
        case 'line': {
          legendWH = await this.drawLineLegend(legend, left, top);
          break;
        }
        case 'fill': {
          legendWH = await this.drawFillLegend(legend, left, top);
          break;
        }
        default:
          break;
      }
      legendMaxWidth = legendWH.width > legendMaxWidth ? legendWH.width : legendMaxWidth;
      legendMaxHeight = legendWH.height > legendMaxHeight ? legendWH.height : legendMaxHeight;
      this.height = this.height > (top + legendWH.height) ? this.height : (top + legendWH.height);
      this.width = this.width > (left + legendWH.width) ? this.width : (left + legendWH.width);
      // tempSumHeight += legendWH.height;
      // tempSumWidth = legendMaxWidth;

    }
    this.width += this.legendOptions.padding.right;
    this.height += this.legendOptions.padding.bottom;
  }
  /**
   * 绘制图例中单个图层的文字
   * @param {Object} legend 图例数据
   * @param {Number} left 距左侧
   * @param {Number} top 距上侧
   */
  drawText(legend, left, top) {
    let width = 0;
    let height = 0;
    const legendText = new fabric.IText(legend.txt, {
      left,
      top,
      // fontFamily,
      fontSize: this.legendOptions.fontSize,
      // fill: iconColor,
    });
    this.legendLayer.fabricCanvas.add(legendText);
    width = legendText.width;
    height = legendText.height;
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }
  async drawSymbolLegend(legend, left, top) {
    let width = 0;
    let height = 0;
    let imgHeight = 0;
    // const legendText = new fabric.IText(legend.txt, {
    //   left,
    //   top,
    //   // fontFamily,
    //   fontSize: this.legendOptions.fontSize,
    //   // fill: iconColor,
    // });
    // this.legendLayer.fabricCanvas.add(legendText);
    // width = legendText.width;
    // height = legendText.height;
    // left = left + Math.ceil(width);
    await new Promise(resolve => {
      new fabric.Image.fromURL(this.legendOptions.imgURL + '?timeStamp=' + new Date(), img => {
        // 图片大小自适应
        if (img.width > legend.legendWidth || img.height > legend.legendHeight) {
          if (img.width > img.height) {
            img.scaleToWidth(legend.legendWidth);
          } else {
            img.scaleToHeight(legend.legendHeight);
          }
        }
        this.legendLayer.fabricCanvas.add(img);
        imgHeight = img.height * img.scaleY;
        width = width + img.width * img.scaleX;
        height = img.height > height ? img.height : height;
        resolve('symbol draw ok');
      }, {
        width: legend.width,
        height: legend.height,
        left,
        top,
        cropX: legend.left,
        cropY: legend.top,
        crossOrigin: 'anonymous',
      });
    });
    const text = this.drawText(legend, left + width + this.legendOptions.iconTextMargin, top + (imgHeight - this.legendOptions.fontSize) / 2);
    width = width + text.width + this.legendOptions.iconTextMargin;
    height = text.height > height ? text.height : height;
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }
  drawLineLegend(legend, left, top) {
    let width = 0;
    let height = 0;
    const legendLine = new fabric.Rect({
      left: left + width,
      top,
      fill: legend.color,
      width: legend.width,
      height: legend.height,
      opacity: legend.opacity,
    });
    this.legendLayer.fabricCanvas.add(legendLine);
    width = width + legendLine.width;
    height = legendLine.height > height ? legendLine.height : height;
    const text = this.drawText(legend, left + width + this.legendOptions.iconTextMargin, top + (legendLine.height - this.legendOptions.fontSize) / 2);
    width = width + text.width + this.legendOptions.iconTextMargin;
    height = text.height > height ? text.height : height;
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }
  drawFillLegend(legend, left, top) {
    let width = 0;
    let height = 0;
    const legendFill = new fabric.Rect({
      left: left + width,
      top,
      fill: legend.color,
      width: legend.width,
      height: legend.height,
      borderColor: legend.outLinecolor,
      hasBorders: true,
      opacity: legend.opacity,
    });
    this.legendLayer.fabricCanvas.add(legendFill);
    width = width + legendFill.width;
    height = legendFill.height > height ? legendFill.height : height;
    const text = this.drawText(legend, left + width + this.legendOptions.iconTextMargin, top + (legendFill.height - this.legendOptions.fontSize) / 2);
    width = width + text.width + this.legendOptions.iconTextMargin;
    height = text.height > height ? text.height : height;
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }
  toDataURL() {
    return this.legendLayer.fabricCanvas.toDataURL({
      format: 'png',
      // left: 100,
      // top: 100,
      // width: 200,
      // height: 200
    });
  }
  getCanvas() {
    return this.legendLayer.fabricCanvas;
  }
  /**
   * 计算总的宽高，包括图例数据的宽高、配置项的margin、每行以及每列的距离
   */
  // calculateWH() {
  //   let width = 0;
  //   let height = 0;
  //   for (const legend of this.legendData) {
  //     width = legend.width; // + this.legendOptions.margin.left + this.legendOptions.margin.right;
  //     height = legend.height; // + this.legendOptions.margin.top + this.legendOptions.margin.bottom;
  //   }
  //   height += Math.ceil(Math.ceil(this.legendData.length / this.legendOptions.columns) * this.legendOptions.rowMargin);
  //   width += Math.ceil(this.legendOptions.columnMargin * this.legendOptions.columnMargin);
  //   return { width, height };
  // }

}
module.exports = MapboxglLegend;
