function verboseCompiledEvaluation(ast, compilation, evaluationFunc) {
  console.log("\n\n\nAST");
  console.log("================================");
  pprint(ast);

  console.log("\nCOMPILATION");
  console.log("================================");
  console.log(compilation);

  console.log("\nJS EVAL");
  console.log("================================");
  console.log(evaluationFunc());
}

module.exports = {
  verboseCompiledEvaluation: verboseCompiledEvaluation
}
