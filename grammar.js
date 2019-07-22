// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require('moo');

const lexer = moo.compile({
  _: { match: /[ \t\n]/, lineBreaks: true },
  lparen: '(',
  rparen: ')',
  gteOperator: '>=',
  lteOperator: '<=',
  gtOperator: '>',
  ltOperator: '<',
  equalityOperator: '==',
  keyword: ['IF', 'ELSE', 'AND', 'OR', 'RETURN', 'IS_MISSING'],
  number: /[0-9]+/,
  identifier: /[a-zA-Z]+[_a-zA-Z0-9]*/,
});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "PrimaryExpression$ebnf$1$subexpression$1", "symbols": ["IfStatement"]},
    {"name": "PrimaryExpression$ebnf$1", "symbols": ["PrimaryExpression$ebnf$1$subexpression$1"]},
    {"name": "PrimaryExpression$ebnf$1$subexpression$2", "symbols": ["IfStatement"]},
    {"name": "PrimaryExpression$ebnf$1", "symbols": ["PrimaryExpression$ebnf$1", "PrimaryExpression$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PrimaryExpression", "symbols": ["PrimaryExpression$ebnf$1", "ElseStatement"]},
    {"name": "Expression", "symbols": ["lp", "__", "ConditionalExpression", "__", "rp"], "postprocess": ([,,conditionalExpression]) => conditionalExpression},
    {"name": "IfStatement", "symbols": [{"literal":"IF"}, "_", "Expression", "_", "ReturnStatement", "_"], "postprocess": (data) => data.filter(x => !!x)},
    {"name": "ElseStatement", "symbols": [{"literal":"ELSE"}, "_", "ReturnStatement", "__"], "postprocess": (data) => data.filter(x => !!x)},
    {"name": "ReturnStatement", "symbols": [{"literal":"RETURN"}, "_", (lexer.has("number") ? {type: "number"} : number)], "postprocess": ([returnToken,,valueToken]) => ({ returnToken, valueToken })},
    {"name": "ConditionalExpression$ebnf$1", "symbols": ["ChainableLogicalExpression"], "postprocess": id},
    {"name": "ConditionalExpression$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ConditionalExpression", "symbols": ["LogicalExpression", "ConditionalExpression$ebnf$1"], "postprocess": (data) => data.filter(x => !!x)},
    {"name": "ConditionalExpression$ebnf$2", "symbols": ["ChainableLogicalExpression"], "postprocess": id},
    {"name": "ConditionalExpression$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ConditionalExpression", "symbols": ["LogicalMissingExpression", "ConditionalExpression$ebnf$2"], "postprocess": (data) => data.filter(x => !!x)},
    {"name": "ConditionalExpression$ebnf$3", "symbols": ["ChainableLogicalExpression"], "postprocess": id},
    {"name": "ConditionalExpression$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ConditionalExpression", "symbols": ["lp", "__", "ConditionalExpression", "__", "rp", "ConditionalExpression$ebnf$3"], "postprocess": (data) => data.filter(x => !!x)},
    {"name": "ChainableLogicalExpression", "symbols": ["_", "LogicalOperator", "_", "ConditionalExpression"], "postprocess":  ([,operator,,expression]) => {
          let type = '';
          switch(operator) {
            case 'AND':
              type = 'AND_LOGICAL_EXPRESSION';
              break;
            case 'OR':
              type = 'OR_LOGICAL_EXPRESSION';
              break;
            default:
              throw new Error(`[Evaluation Failed] Unknown logical operator: ${operator}`);
          }
        
          return {
            type,
            logicalOp: operator,
            expression: expression.filter(x => !!x),
          }
        } },
    {"name": "LogicalOperator", "symbols": [{"literal":"AND"}], "postprocess": ([data]) => data.value},
    {"name": "LogicalOperator", "symbols": [{"literal":"OR"}], "postprocess": ([data]) => data.value},
    {"name": "LogicalExpression", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "_", "RelationalOperator", "_", (lexer.has("number") ? {type: "number"} : number)], "postprocess":  ([identifier,,operator,,number]) => ({
          type: 'RELATIONAL_EXPRESSION',
          leftOp: identifier.value,
          relationalOp: operator,
          rightOp: number.value
        }) },
    {"name": "RelationalOperator", "symbols": [(lexer.has("gteOperator") ? {type: "gteOperator"} : gteOperator)], "postprocess": ([data]) => data.value},
    {"name": "RelationalOperator", "symbols": [(lexer.has("lteOperator") ? {type: "lteOperator"} : lteOperator)], "postprocess": ([data]) => data.value},
    {"name": "RelationalOperator", "symbols": [(lexer.has("gtOperator") ? {type: "gtOperator"} : gtOperator)], "postprocess": ([data]) => data.value},
    {"name": "RelationalOperator", "symbols": [(lexer.has("ltOperator") ? {type: "ltOperator"} : ltOperator)], "postprocess": ([data]) => data.value},
    {"name": "RelationalOperator", "symbols": [(lexer.has("equalityOperator") ? {type: "equalityOperator"} : equalityOperator)], "postprocess": ([data]) => data.value},
    {"name": "LogicalMissingExpression", "symbols": [{"literal":"IS_MISSING"}, "lp", (lexer.has("identifier") ? {type: "identifier"} : identifier), "rp"], "postprocess":  ([,,identifier]) => ({
          type: 'IS_MISSING_LOGICAL_EXPRESSION',
          identifier: identifier.value
        }) },
    {"name": "rp", "symbols": [(lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": () => null},
    {"name": "lp", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen)], "postprocess": () => null},
    {"name": "_$ebnf$1", "symbols": [(lexer.has("_") ? {type: "_"} : _)]},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("_") ? {type: "_"} : _)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null},
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("_") ? {type: "_"} : _)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": () => null}
]
  , ParserStart: "PrimaryExpression"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
