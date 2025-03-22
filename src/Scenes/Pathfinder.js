import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { solveSMT } from "../z3";
//Different models: "gemini-2.0-flash-lite", "gemini-2.0-flash-thinking-exp", "gemini-2.0-flash"
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-lite",
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
const forest = {
  left: 10,
  right: 23,
  bottom: 12,
  top: 0,
};
const house_1 = {
  left: 3,
  right: 8,
  bottom: 4,
  top: 2,
};
const house_2 = {
  left: 14,
  right: 20,
  bottom: 4,
  top: 2,
};
const house_3 = {
  left: 27,
  right: 32,
  bottom: 20,
  top: 17,
};
const promptForIndex = new PromptTemplate({
  inputVariables: ["command"],
  template: `
  You are an expert in interpreting user commands for a tile map and returning an index ID of the item being referenced.
  Your task is to identify the index ID of the item described in the user command and return that index ID along with a brief description if provided.
  Here is the list of index IDs and their associated item:
  - Wheelbarrow: 58
  - Mushroom: 30
  - Beehive: 95
  - Bomb: 106
  Additional instruction:
  - If the user specifies putting a specific item in the list provided, return the index ID of that item as a single integer.
  - If the user does not specify an item, randomize this item from the list.
  Example input: "Put a wheelbarros in the left side of the fence"
  Expected output: "57"

  User Command: "{command}"

  Output only the index ID, without additional text or explanations.
  RETURN ONLY THE INDEX ID AS A SINGLE STRING.
  PLAINTEXT ONLY
  NO MARKDOWN.
  `,
});
const prompt = new PromptTemplate({
  inputVariables: ["command"],
  template: `
  You are an expert in converting user commands into Z3 SMT-LIB constraints.

Your task is to convert the following user command into a valid Z3 SMT constraint in SMT-LIB format:

1. **Declare variables** 'x' and 'y' as integers.
2. **Identify relevant area definitions** to assist in constraint construction.
   - Fence 1: left_x=${fence_area_1.left}, right_x=${fence_area_1.right}, top_y=${fence_area_1.top}, bottom_y=${fence_area_1.bottom}
   - Fence 2: left_x=${fence_area_2.left}, right_x=${fence_area_2.right}, top_y=${fence_area_2.top}, bottom_y=${fence_area_2.bottom}
   - Forest: left_x=${forest.left}, right_x=${forest.right}, top_y=${forest.top}, bottom_y=${forest.bottom}
   - House 1: left_x=${house_1.left}, right_x=${house_1.right}, top_y=${house_1.top}, bottom_y=${house_1.bottom}
   - House 2: left_x=${house_2.left}, right_x=${house_2.right}, top_y=${house_2.top}, bottom_y=${house_2.bottom}
   - House 3: left_x=${house_3.left}, right_x=${house_3.right}, top_y=${house_3.top}, bottom_y=${house_3.bottom}

3. **Apply spatial rules (Y-axis is inverted in tile maps):**
   - A **lower y-value moves down**, a **higher y-value moves up**.
   - "Right side of the fence" → x is **closer to right_x but inside**.
   - "Top of the fence" → y is **closer to top_y but inside**.
   - "Strictly inside" → No contact with **left_x, right_x, top_y, or bottom_y**.

4. **Match commands to logical expressions:**
   - "Inside the fence" → '(and (> x left_x) (< x right_x) (> y bottom_y) (< y top_y))'
   - "Left side of the fence" → '(and (> x left_x) (< x (left_x + (right_x - left_x)/2)) (> y bottom_y) (< y top_y))'
   - "Near the bottom of the fence" → '(and (> x left_x) (< x right_x) (> y bottom_y) (< y (bottom_y + (top_y - bottom_y)/2)))'
   - "Outside the fence" → '(or (< x left_x) (> x right_x) (< y bottom_y) (> y top_y))'

5. **Construct a valid SMT-LIB constraint using the above rules**.

**Example Input:**  
"Place a beehive in the lower right corner of fence 1. "

**Example Output:**  
"(declare-const x Int) (declare-const y Int) (assert (and (>= x 35) (<= x 37) (>= y 3) (<= y 5)))"

Convert the user command below into the proper SMT-LIB constraint:

User Command: "{command}"

Output **only** the SMT-LIB constraints as a **single plaintext string** with **no markdown** and **no explanations**.
`,
});
async function generateConstraint(command) {
  const formattedConstraintPrompt = await prompt.format({ command });

  // Format the command for the index ID retrieval prompt
  const formattedIndexPrompt = await promptForIndex.format({ command });

  // Generate the SMT constraint response
  var constraintResponse = await llm.invoke(formattedConstraintPrompt);
  var cleanedConstraintResponse = constraintResponse.content.replace(/```(?:smt|smt2)?\s*|\s*```/g, "");

  var indexResponse = await llm.invoke(formattedIndexPrompt);
  var cleanedIndexResponse = indexResponse.content.trim();
  console.log("SMT Constraint:");
  console.log(cleanedConstraintResponse);

  console.log("Item Index ID:");
  console.log(cleanedIndexResponse);

  return {
    constraint: cleanedConstraintResponse.toString(),
    indexId: cleanedIndexResponse.toString(),
  };
}

export async function solveConstraint(user_input) {
  try {
    const { constraint, indexId } = await generateConstraint(user_input);
    const values = await solveSMT(constraint);
    return { values, indexId };
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

    await this.placeTileFromSolver(user_input);
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
      }
    });

    document.getElementById("userInput").addEventListener("focus", () => {});
    document.getElementById("userInput").addEventListener("blur", () => {});
  }

  async placeTileFromSolver(textInput) {
    try {
      const { values, indexId } = await solveConstraint(textInput);
      if (values.length != 0) {
        this.put(indexId, values);
      } else {
        console.log("No valid tile placement found.");
      }
    } catch (error) {
      console.error("Error placing tile:", error.message);
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
  put(tile_id, values) {
    if (values.length == 0) {
      console.log("no more solutions");
      return;
    }
    values = this.avoid(values);
    let random = Phaser.Math.Between(0, values.length - 1);
    var tile = values.splice(random, 1)[0];
    const layer = this.map.getLayer("Decor").tilemapLayer;
    const { xVal, yVal } = tile;
    tiles_put.push(tile);
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
