import fs from "fs";

const casePath = "d:/Music Bot/case.js";
let content = fs.readFileSync(casePath, "utf-8");

if (!content.includes("ffmpeg-static")) {
  content = `import ffmpegPath from "ffmpeg-static";\n` + content;
  content = content.replace(
    "export const distube = new DisTube(client, {",
    "export const distube = new DisTube(client, {\n  ffmpeg: {\n    path: ffmpegPath,\n  },"
  );
  fs.writeFileSync(casePath, content, "utf-8");
  console.log("Successfully configured ffmpegPath in DisTube!");
}
