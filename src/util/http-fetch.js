'use strict';
const get = async HttpURL => {
  const result = await fetch(HttpURL, {
    headers: {
      'content-type': 'application/json',
    },
  });
  if (result.status !== 200) {
    console.error('获取失败');
    return;
  }
  const data = await result.json();
  return data;
};
module.exports = { get };
