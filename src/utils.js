/**
 * 遍历树形数据
 *  - 深度优先
 *  - 采用的循环遍历逻辑，而非递归遍历
 * @param {Object|Aray} data - 待遍历的数据
 * @param {Function} cb - 回调函数
 * @param {*} childrenName - 子节点名称
 */
export function eachTree(data, cb, childrenName = "children") {
  let current,
    parent = null,
    index = 0, // 全局index
    children,
    parents = [];
  if (Array.isArray(data)) {
    data = [...data];
  } else {
    data = [data];
  }
  parents.push({
    $root: true,
    [childrenName]: [...data],
  });
  while (data.length) {
    current = data[0];
    parent = parents[0];
    if (current === parent) {
      parents.shift();
      data.shift();
      delete parent.$currentIndex;
    } else {
      // 当前项的index
      if ("$currentIndex" in parent) {
        parent.$currentIndex++;
      } else {
        parent.$currentIndex = 0;
      }
      const rv = cb(current, {
        index: index++,
        parent,
        currentIndex: parent.$currentIndex,
        parents,
      });
      if (rv === "break") {
        break;
      }
      if (rv !== "continue" && (children = current[childrenName])) {
        parents.unshift(current);
        Array.prototype.unshift.apply(data, children);
      } else {
        data.shift();
      }
    }
  }
  parents.forEach((parent) => {
    delete parent.$currentIndex;
  });
}

export function typeOf(t, e) {
  let type = Object.prototype.toString.call(t).slice(8, -1);
  return e ? type === e : type;
}

export function each(target, cb) {
  let t = typeOf(target);
  if (t === "Array") {
    for (let i = 0; i < target.length; i++) {
      if (cb(target[i], i)) {
        break;
      }
    }
  } else if (t === "Object") {
    for (let k in target) {
      if (cb(target[k], k)) {
        break;
      }
    }
  }
}
