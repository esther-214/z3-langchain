// game config
import { Pathfinder } from "./Scenes/Pathfinder.js";
let config = {
  parent: "phaser-game",
  type: Phaser.CANVAS,
  render: {
    pixelArt: true, // prevent pixel art from getting blurred when scaled
  },
  width: 1280,
  height: 800,
  scene: [Load, Pathfinder],
};

const game = new Phaser.Game(config);
