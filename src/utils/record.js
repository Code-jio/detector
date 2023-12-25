// /**
//  * 用户操作日志结构: {
//  *  name：'渲染',
//  *  type: 'click',
//  *  timestamp: new Date().getTime(),
//  *  target: 'button',
//  *  params: {
//  *      ...渲染参数
//  *  },
//  *  real_time_perfermance: {
//  *     FPS: 60,
//  *     MEM: 0.1,
//  *     Meshs:0,
//  *     Side:0,
//  *     Materials:0,
//  *     Textures:0,
//  *  },
//  * }
//  */
// export const operation_log = []; // 用户操作日志
// /**
//  * 性能记录结构: {
//  * time:new Date().getTime(),
//  * FPS: 60,
//  * MEM: 0.1,
//  * }
//  */
// export const performance_record = []; // 性能记录
// export const real_time_perfermance = {
//   FPS: undefined,
//   MEM: undefined,
//   Meshs: 0,
//   Sides: 0,
//   Materials: 0,
//   Textures: 0,
// }; // 实时性能记录

// 创建记录类 Record
class Record {
  constructor() {
    this.operation_log = [];
    this.performance_record = [];
    this.real_time_perfermance = {
      FPS: undefined,
      MEM: undefined,
      Meshs: 0,
      Sides: 0,
      Materials: 0,
      Textures: 0,
    }; // 实时性能记录
  }

  /**
   * 记录用户操作日志
   * @param {Object} log
   */
  recordOperationLog(log) {
    this.operation_log.push(log);
    // console.log('operation_log', this.operation_log);
    return this.operation_log;
  }
  /**
   *  记录性能
   * @param {*} performance
   * @returns
   */
  recordPerformance(performance) {
    this.performance_record.push(performance);
    // console.log('performance_record', this.performance_record);
    return this.performance_record;
  }
  /**
   * 记录实时性能
   * @param {Array} performance 实时性能
   * @returns {Array} real_time_perfermance
   */
  recordRealTimePerformance(performance) {
    this.real_time_perfermance = performance;
    // console.log('real_time_perfermance', this.real_time_perfermance);
    return this.real_time_perfermance;
  }
}
export default new Record();
