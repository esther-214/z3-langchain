import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { solveSMT } from "../z3";
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  temperature: 0,
  maxRetries: 2,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
});
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
const prompt = new PromptTemplate({
  inputVariables: ["command"],
  template: `
  You are an expert in converting user commands into Z3 SMT-LIB constraints.
  Your task is to convert the following user command into a valid Z3 SMT constraint in SMT-LIB format:
  1. Declare variables 'x' and 'y' as integers.
  2. Create an '(assert ...)' statement based on the command.
  3. Use the following area definitions for reference each side of the fence is where the fence ends so there is a fence tile piece on it:
    - Fence Area 1: left=${fence_area_1.left}, right=${fence_area_1.right}, top=${fence_area_1.top}, bottom=${fence_area_1.bottom}
    - Fence Area 2: left=${fence_area_2.left}, right=${fence_area_2.right}, top=${fence_area_2.top}, bottom=${fence_area_2.bottom}
  4. Ensure that (if requested) the tile or object is strictly inside the fence (i.e., not touching the edges).

  Example input: "Put something in the left side of the fence"

  Convert the user command below into the proper SMT-LIB constraint:

  User Command: "{command}"

  Output only valid SMT-LIB constraints with no additional text or explanations.
  `,
});
async function generateConstraint(command) {
  const formattedPrompt = await prompt.format({ command });
  const response = await llm.invoke(formattedPrompt);
  console.log(response.content);
  return response.content.toString();
}

export async function solveConstraint(user_input) {
  try {
    const response = await generateConstraint(user_input);
    const { xVal, yVal } = await solveSMT(response);
    return { xVal, yVal }; // Ensure you're returning the data
  } catch (error) {
    console.error("Error:", error.message);
  }
}

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
    this.textInput = document.getElementById("userInput");
    this.submitButton = document.getElementById("submitButton"); // Get the submit button element
    this.submitButton.addEventListener("click", this.handleSubmit.bind(this)); // Add event listener to the submit button

    this.map = this.add.tilemap("three-farmhouses", this.TILESIZE, this.TILESIZE, this.TILEHEIGHT, this.TILEWIDTH);
    this.tileset = this.map.addTilesetImage("kenney-tiny-town", "tilemap_tiles");
    this.decorLayer = this.map.createLayer("Decor", this.tileset, 0, 0);
    this.groundLayer = this.map.createLayer("Ground-n-Walkways", this.tileset, 0, 0);
    this.treesLayer = this.map.createLayer("Trees-n-Bushes", this.tileset, 0, 0);
    this.housesLayer = this.map.createLayer("Houses-n-Fences", this.tileset, 0, 0);
    this.decorLayer.setDepth(3); // This will be the bottom layer
    this.groundLayer.setDepth(0); // This will be above the decor layer
    this.treesLayer.setDepth(1); // This will be above the ground layer
    this.housesLayer.setDepth(2); // This will be the topmost layer
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(this.SCALE);
  }

  async handleSubmit() {
    const user_input = this.textInput.value;
    if (!user_input) {
      console.error("Please enter input before submitting.");
      return;
    }

    const tile_id = 58; // Example tile ID, you can change it based on your need
    await this.placeTileFromSolver(user_input, tile_id); // Call placeTileFromSolver when the submit button is clicked
  }

  update() {
    this.input.keyboard.on("keydown", (event) => {
      const inputElement = document.getElementById("userInput");

      if (inputElement === document.activeElement) {
        return;
      }

      if (event.key === "c") {
        console.log("c");
        this.clear();
        this.map.render();
      }
    });

    document.getElementById("userInput").addEventListener("focus", () => {});
    document.getElementById("userInput").addEventListener("blur", () => {});
  }

  async placeTileFromSolver(textInput, tile_id) {
    try {
      const { xVal, yVal } = await solveConstraint(textInput);
      if (xVal != null && yVal != null) {
        this.put(tile_id, xVal, yVal);
      } else {
        console.log("No valid tile placement found.");
      }
    } catch (error) {
      console.error("Error placing tile:", error.message);
    }
  }

  put(tile_id, xVal, yVal) {
    const layer = this.map.getLayer("Decor").tilemapLayer;
    tiles_put.push({ xVal, yVal });
    return layer.putTileAt(tile_id, xVal, yVal);
  }

  clear() {
    const layer = this.map.getLayer("Decor").tilemapLayer;
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
