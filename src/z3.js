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
  let values = [];
  // If the result is sat (satisfiable), enter the loop
  while ((await solver.check()) === "sat") {
    const model = solver.model();

    let xEval = model.eval(x);
    let yEval = model.eval(y);

    if (!xEval || !yEval) {
      throw new Error("Solver did not return valid values for x or y");
    }

    let xStr = xEval.toString();
    let yStr = yEval.toString();

    let xVal = parseInt(xStr);
    let yVal = parseInt(yStr);

    if (isNaN(xVal) || isNaN(yVal)) {
      throw new Error(`Invalid value from solver: x='${xStr}', y='${yStr}'`);
    }
    values.push({ xVal, yVal });
    solver.add(Or(x.neq(xVal), y.neq(yVal)));
  }
  solver.reset();
  return values;
}
