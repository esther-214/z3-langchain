import { init } from "z3-solver";
const { Context } = await init();
const { Solver } = new Context("main");
export async function solveSMT(smtInput) {
  const solver = new Solver();
  solver.fromString(smtInput);
  console.log("loaded");

  const result = await solver.check();
  console.log("Satisfiability:", result);

  if (result === "sat") {
    return solver.model().toString();
  } else {
    console.log("No solution found.");
  }
}
