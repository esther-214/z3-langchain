import { generateConstraint } from "../gemini";
const fence_area_1 = {
  left: 34,
  right: 38,
  bottom: 6,
  top: 2,
};
const fence_area_2 = {
  left: 21,
  right: 29,
  bottom: 20,
  top: 17,
};
const forest_area = {
  left: 11,
  right: 23,
  bottom: 12,
  top: 1,
};
var inside_fence_1 = await find([], fence_area_1);
var inside_fence_2 = await find([], fence_area_2);
var inside_forest = await find([], forest_area);
var tiles_put = [];
export class Pathfinder extends Phaser.Scene {
  constructor() {
    super("pathfinderScene");
  }

  preload() {}

  init() {
    this.TILESIZE = 16;
    this.SCALE = 2.0;
    this.TILEWIDTH = 40;
    this.TILEHEIGHT = 25;
  }

  create() {
    // Create a new tilemap which uses 16x16 tiles, and is 40 tiles wide and 25 tiles tall
    this.map = this.add.tilemap("three-farmhouses", this.TILESIZE, this.TILESIZE, this.TILEHEIGHT, this.TILEWIDTH);

    // Add a tileset to the map
    this.tileset = this.map.addTilesetImage("kenney-tiny-town", "tilemap_tiles");

    // Create the layers
    this.groundLayer = this.map.createLayer("Ground-n-Walkways", this.tileset, 0, 0);
    this.treesLayer = this.map.createLayer("Trees-n-Bushes", this.tileset, 0, 0);
    this.housesLayer = this.map.createLayer("Houses-n-Fences", this.tileset, 0, 0);
    // Camera settings
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(this.SCALE);

    this.inputBox = document.createElement("input");
    this.inputBox.type = "text";
    this.inputBox.placeholder = "Type here...";
    this.inputBox.style.position = "absolute";
    this.inputBox.style.bottom = "10px";
    this.inputBox.style.left = "50%";
    this.inputBox.style.transform = "translateX(-50%)";
    this.inputBox.style.width = "80%";
    this.inputBox.style.padding = "10px";
    this.inputBox.style.fontSize = "16px";
    this.inputBox.style.borderRadius = "5px";
    this.inputBox.style.border = "1px solid #ccc";
    document.body.appendChild(this.inputBox);
    // Handle input (Example: log input when pressing Enter)
    this.inputBox.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        this.user_input = this.inputBox.value;
        this.inputBox.value = ""; // Clear input after enter
      }
    });

    // Ensure Phaser doesn't capture input events
    this.inputBox.addEventListener("focus", () => {
      this.input.keyboard.enabled = false;
    });
    this.inputBox.addEventListener("blur", () => {
      this.input.keyboard.enabled = true;
    });
    // Handle mouse clicks
    // Handles the clicks on the map to make the character move
    // The this parameter passes the current "this" context to the
    // function this.handleClick()
    this.input.on("pointerup", this.handleClick, this);

    this.cKey = this.input.keyboard.addKey("C");
    this.lowCost = false;

    this.inside_fence_1 = inside_fence_1;
    this.inside_fence_2 = inside_fence_2;
    this.inside_forest = inside_forest;
    this.qKey = this.input.keyboard.addKey("Q");
    this.eKey = this.input.keyboard.addKey("E");
  }
  async callGenerateConstraint(user_input) {
    return await generateConstraint(user_input);
  }
  update() {
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.put(this.inside_fence_1, 58);
      this.put(this.inside_fence_2, 58);
      this.put(this.inside_forest, 30);
      this.map.render;
    }
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.clear();
      this.map.render;
    }
  }

  avoid(values) {
    const layer = this.map.getLayer("Trees-n-Bushes").tilemapLayer;
    const updatedValues = values.filter(({ xVal, yVal }) => {
      const tile = layer.getTileAt(xVal, yVal);
      if (tile) {
        return false;
      }
      return true;
    });
    return updatedValues;
  }
  put(values, tile_id) {
    if (values.length == 0) {
      console.log("no more solutions");
      return;
    }
    values = this.avoid(values);
    let random = Phaser.Math.Between(0, values.length - 1);
    var tile = values.splice(random, 1)[0];
    const layer = this.map.getLayer("Houses-n-Fences").tilemapLayer;
    const { xVal, yVal } = tile;
    tiles_put.push(tile);
    return layer.putTileAt(tile_id, xVal, yVal);
  }
  clear() {
    console.log(tiles_put);
    const layer = this.map.getLayer("Houses-n-Fences").tilemapLayer;
    tiles_put.forEach(({ xVal, yVal }) => {
      layer.removeTileAt(xVal, yVal);
    });

    tiles_put = [];
  }

  tileXtoWorld(tileX) {
    return tileX * this.TILESIZE;
  }

  tileYtoWorld(tileY) {
    return tileY * this.TILESIZE;
  }
}
