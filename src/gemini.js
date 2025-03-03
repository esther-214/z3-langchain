import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { solveSMT } from "./z3.js";
import * as dotenv from "dotenv";
dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  temperature: 0,
  maxRetries: 2,
  apiKey: dotenv.GOOGLE_API_KEY,
});
const prompt = new PromptTemplate({
  inputVariables: ["command"],
  template: `Convert the following user command into a Z3 SMT constraint:
    "{command}"
    Output should be in valid SMT-LIB format.
    No other comments should be returned.
    Return as one valid string with no additional tagging.`,
});
export async function generateConstraint(command) {
  const formattedPrompt = await prompt.format({ command });
  const response = await llm.invoke(formattedPrompt);
  console.log(response.content);
  return response.content.toString();
}
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getUserInput(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}
async function main() {
  try {
    const user_input = await getUserInput("Enter your constraints: ");
    rl.close();
    var response = await generateConstraint(user_input);
    const solution = await solveSMT(response);
    console.log("Solution:", solution);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
