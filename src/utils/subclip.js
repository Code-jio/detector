import { AnimationUtils } from 'three';
/**
 * 关键帧动画裁剪补丁
 * readme:
 *      1. 传入的动画必须是关键帧动画
 *      2. 在这个函数中，传入的startFrame和endFrame是关键帧轨道中的帧索引，而不是时间值
 *      3. 传入的startFrame和endFrame是闭区间，即[startFrame, endFrame]
 *
 *
 *  如果需要更精细的控制，比如说精确到某个时间点，可以将帧索引改回时间值，具体参见下方注释部分
 *
 * @param {*} sourceClip 源动画
 * @param {*} name 名称
 * @param {*} startFrame 开始帧
 * @param {*} endFrame 结束帧
 * @param {*} fps 帧率
 * @returns {AnimationClip} 裁剪后的动画
 */
export const subclip = (sourceClip, name, startFrame, endFrame, fps = 30) => {
  const clip = sourceClip.clone();

  clip.name = name;

  const tracks = [];

  for (let i = 0; i < clip.tracks.length; ++i) {
    const track = clip.tracks[i];
    const valueSize = track.getValueSize();
    const times = [];
    const values = [];
    for (let j = 0; j < track.times.length; ++j) {
      //   const frame = track.times[j]; // frame 为时间值 j为帧索引
      //   const frame = track.times[j] * fps;
      //   if (j < startFrame || j >= endFrame) continue; // 区间：[startFrame, endFrame)
      if (j < startFrame || j > endFrame) continue; // 区间：[startFrame, endFrame]
      //   if (frame < startFrame || frame >= endFrame) continue;
      times.push(track.times[j]);
      for (let k = 0; k < valueSize; ++k) {
        values.push(track.values[j * valueSize + k]);
      }
    }

    if (times.length === 0) continue;

    track.times = AnimationUtils.convertArray(times, track.times.constructor);
    track.values = AnimationUtils.convertArray(
      values,
      track.values.constructor
    );

    tracks.push(track);
  }
  console.log(tracks);
  clip.tracks = tracks;

  // find minimum .times value across all tracks in the trimmed clip

  let minStartTime = Infinity;

  for (let i = 0; i < clip.tracks.length; ++i) {
    if (minStartTime > clip.tracks[i].times[0]) {
      minStartTime = clip.tracks[i].times[0];
    }
  }

  // shift all tracks such that clip begins at t=0

  for (let i = 0; i < clip.tracks.length; ++i) {
    clip.tracks[i].shift(-1 * minStartTime);
  }

  clip.resetDuration();

  return clip;
};
