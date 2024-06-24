// 创建三角形，并赋予渐变材质
// 定点着色器：
attribute vec4 a_Position; // 接收顶点坐标
varying  vec2 a_TexCoord; // 接收纹理坐标
varying vec2 v_TexCoord; // 传递纹理坐标
void main(){
    gl_Position=a_Position;
    v_TexCoord=a_TexCoord;
}
// 片元着色器：
precision mediump float;
uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;
void main(){
    gl_FragColor=texture2D(u_Sampler,v_TexCoord);
}
// 顶点着色器中的 attribute 变量，是只能在顶点着色器中使用的变量，它的值是从外部传入的，而且是不变的。
// 片元着色器中的 varying 变量，是只能在片元着色器中使用的变量，它的值是从顶点着色器传入的，而且是会被内插的。
