# @preprocessor typescript

@{%
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
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

PrimaryExpression -> (IfStatement):+ ElseStatement

Expression -> lp __ ConditionalExpression __ rp {% ([,,conditionalExpression]) => conditionalExpression %}

IfStatement -> "IF" _ Expression _ ReturnStatement ws {% (data) => data.filter(x => !!x) %}
ElseStatement -> "ELSE" _ ReturnStatement ws:? {% (data) => data.filter(x => !!x) %}
ReturnStatement -> "RETURN" _ %number {% ([returnToken,,valueToken]) => ({ returnToken, valueToken }) %}

ConditionalExpression -> 
    LogicalExpression ChainableLogicalExpression:?
    {% (data) => data.filter(x => !!x) %}
  | LogicalMissingExpression ChainableLogicalExpression:?
    {% (data) => data.filter(x => !!x) %}
  | lp __ ConditionalExpression __ rp ChainableLogicalExpression:?
    {% (data) => data.filter(x => !!x) %}

ChainableLogicalExpression ->
  _ LogicalOperator _ ConditionalExpression
  {% ([,operator,,expression]) => {
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
  } %}

LogicalOperator -> 
    "AND" {% ([data]) => data.value %} 
  | "OR"  {% ([data]) => data.value %}

LogicalExpression -> 
  %identifier _ RelationalOperator _ %number 
  {% ([identifier,,operator,,number]) => ({
    type: 'LOGICAL_EXPRESSION',
    leftOp: identifier.value,
    relationalOp: operator,
    rightOp: number.value
  }) %}

RelationalOperator -> 
    %gteOperator {% ([data]) => data.value %}
  | %lteOperator {% ([data]) => data.value %}
  | %gtOperator {% ([data]) => data.value %}
  | %ltOperator {% ([data]) => data.value %}
  | %equalityOperator {% ([data]) => data.value %}

LogicalMissingExpression -> 
  "IS_MISSING" lp %identifier rp 
  {% ([,,identifier]) => ({
    type: 'IS_MISSING_LOGICAL_EXPRESSION',
    identifier: identifier.value
  }) %}

rp -> %rparen {% () => null %}
lp -> %lparen {% () => null %}
ws -> (_ | nl):+ {% () => null %}
nl -> %newline {% () => null %}
_ -> %_:+ {% () => null %}
__ -> %_:* {% () => null %}
