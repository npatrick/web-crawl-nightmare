/**
 * objToArr
 * Simply takes an object and turns it into an
 * array of objects with props: username & data
 * 
 * @param  {Object} obj
 * @return {Array} result
 */
const objToArr = (obj) => {
    let result = [];
    /* Schema needs to be in DB
     *
     * {
     *   username: String,
     *   data: Object
     * }
     *
    */
    for (let key in obj) {
      result.push({ username: key, data: obj[key] })
    }

    return result;
  };

module.exports = objToArr;
