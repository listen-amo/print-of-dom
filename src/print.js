import { eachTree } from "./utils.js";
// 打印dom
// 根节点宽度设置 全局样式注入 中间处理函数 过滤器处理
export default function printDom(dom, options) {
  const regExclude = /^(-webkit-|transition|stroke|scroll|overscroll|cursor|animation)/;
  const elCache = [];
  eachTree([dom], (el) => {
    // 记录初始行内样式以及修改过行内样式的元素
    if (el.style.cssText) {
      el._PRINT_DOM_ORIGIN_CSSTEXT = el.style.cssText;
    }
    elCache.push(el);
    // 把所有样式转换为行内样式
    const styles = getComputedStyle(el);
    let i = styles.length,
      cssText = "";
    while (i--) {
      const k = styles.item(i);
      let v;
      if (!regExclude.test(k)) {
        v = styles.getPropertyValue(k);
        cssText += k + ":" + v + ";";
      }
    }
    el.style.cssText = cssText;
  });
  // 复制dom
  let printDom = dom.cloneNode(true);

  // 恢复原本的行内样式
  elCache.forEach((el) => {
    if (el._PRINT_DOM_ORIGIN_CSSTEXT) {
      el.style.cssText = el._PRINT_DOM_ORIGIN_CSSTEXT;
      delete el._PRINT_DOM_ORIGIN_CSSTEXT;
    } else {
      el.style.cssText = "";
    }
  });
  // 创建iframe
  const dIframe = document.createElement("iframe");
  dIframe.style.cssText = "position: absolute; z-index: -1; left: -9999;top: -9999;";
  document.body.appendChild(dIframe);
  dIframe.contentDocument.body.appendChild(printDom);
  // 所有的图片加载完成
  const imageLoaded = Promise.all(
    Array.from(dIframe.contentDocument.images).map(
      (img) =>
        new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        })
    )
  );
  imageLoaded.then(() => {
    dIframe.contentWindow.print(); // 调用打印的时候会阻塞
    document.body.removeChild(dIframe);// 移除iframe
  });
}