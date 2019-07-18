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
  identifier: /\w+/,
});
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

PrimaryExpression -> (IfStatement):+ ElseStatement

Expression -> lp __ ConditionalExpression __ rp {% ([,,conditionalExpression]) => conditionalExpression %}

IfStatement -> "IF" _ Expression _ ReturnStatement ws {% (data) => data.filter(x => !!x) %}
ElseStatement -> "ELSE" _ ReturnStatement ws:? {% (data) => data.filter(x => !!x) %}
ReturnStatement -> "RETURN" _ %number {% ([keyword,,token]) => ({ value: +token.value }) %}

ConditionalExpression -> 
    LogicalExpression ChainableLogicalExpression:?
    {% (data) => data.filter(x => !!x) %}
  | LogicalMissingExpression ChainableLogicalExpression:?
    {% (data) => data.filter(x => !!x) %}
  | lp __ ConditionalExpression __ rp ChainableLogicalExpression:?
    {% (data) => data.filter(x => !!x) %}

ChainableLogicalExpression ->
  _ LogicalOperator _ ConditionalExpression
  {% ([,operator,,expression]) => ({
    operator,
    expression: expression.filter(x => !!x),
  }) %}

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
    type: 'LOGICAL_MISSING_EXPRESSION',
    identifier: identifier.value
  }) %}

rp -> %rparen {% () => ')' %}
lp -> %lparen {% () => '(' %}
ws -> (_ | nl):+ {% () => null %}
nl -> %newline {% () => null %}
_ -> %_:+ {% () => null %}
__ -> %_:* {% () => null %}
