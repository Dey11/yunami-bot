import { AttachmentBuilder } from "discord.js";
import Canvas from "@napi-rs/canvas";

export async function buildCanvas() {
  const canvas = Canvas.createCanvas(1000, 1000);
  const ctx = canvas.getContext("2d");

  const background = await Canvas.loadImage(
    new URL("../../src/quickstart/Background.png", import.meta.url)
  );

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "Background.png",
  });
}
