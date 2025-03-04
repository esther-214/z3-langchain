import { init } from "z3-solver";
const { Context } = await init();
const { Solver, Int, Or } = new Context("main");
export async function solveSMT(smtInput) {
  const solver = new Solver();
  solver.fromString(smtInput);
  console.log("loaded");

  let x = Int.const("x");
  let y = Int.const("y");

  // Check satisfiability
  const result = await solver.check();
  console.log("Satisfiability:", result);

  // If the result is sat (satisfiable), enter the loop
  if (result === "sat") {
    const model = solver.model();

    // Extract the values for x and y from the model
    let xVal = parseInt(model.eval(x).toString(), 10);
    let yVal = parseInt(model.eval(y).toString(), 10);
    return { xVal, yVal };
  }
}
