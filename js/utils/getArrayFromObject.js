export default function getArrayFromObject(obj) {
  if (!obj || typeof obj !== 'object') return [];
  const result = [];
  let index = 0;
  while (obj.hasOwnProperty(index)) {
    result.push(obj[index]);
    index++;
  }
  return result;
}