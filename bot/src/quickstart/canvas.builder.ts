import { AttachmentBuilder } from "discord.js";
import Canvas from "@napi-rs/canvas";
import path from "path";

export async function buildCanvas(imagePath: string) {
  const canvas = Canvas.createCanvas(2752, 1536);
  const ctx = canvas.getContext("2d");

  const absolutePath = path.resolve(process.cwd(), "assets", imagePath);

  const background = await Canvas.loadImage(absolutePath);

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const boxX = 320;
  const boxY = 1150;
  const boxW = 2120;
  const boxH = 220;

  ctx.font = "72px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = "What are you thinking mate?.";

  const x = boxX + boxW / 2;
  const y = boxY + boxH / 2;
  ctx.fillText(text, x, y);

  const buffer = await canvas.toBuffer("image/png");

  return new AttachmentBuilder(buffer, {
    name: "Background.png",
  });
}