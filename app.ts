import * as nearley from 'nearley';
const grammar = require('./grammar');
import * as fs from 'fs';
import { exec } from 'child_process';
import * as _ from 'lodash';

interface IMooLexerToken {
  col: number;
  line: number;
  lineBreaks: number;
  offset: number;
  text: string;
  toString: () => any;
  type: string;
  value: any;
}

interface LogicalExpressions
  extends Array<
    | LogicalExpressions
    | ILogicalExpression
    | IConditionalLogicalExpression
    | IMissingLogicalExpression
  > {}

interface ILogicalExpression {
  type: LogicalExpressionTypes.LOGICAL_EXPR;
  leftOp: string;
  relationalOp: string;
  rightOp: string;
}

interface IConditionalLogicalExpression {
  type: LogicalExpressionTypes.AND_EXPR | LogicalExpressionTypes.OR_EXPR;
  logicalOp: string;
  expression: LogicalExpressions[];
}

interface IMissingLogicalExpression {
  type: LogicalExpressionTypes.IS_MISSING_EXPR;
  identifier: string;
}

enum LogicalExpressionTypes {
  LOGICAL_EXPR = 'LOGICAL_EXPRESSION',
  AND_EXPR = 'AND_LOGICAL_EXPRESSION',
  OR_EXPR = 'OR_LOGICAL_EXPRESSION',
  IS_MISSING_EXPR = 'IS_MISSING_LOGICAL_EXPRESSION'
}

interface IReturnStatement {
  returnToken: IMooLexerToken;
  valueToken: IMooLexerToken;
}

const input = `IF ((((x > 0 OR z > 0)) AND IS_MISSING(x) AND (z > 0 OR (x > 0 AND z > 0))) AND y > 0 OR z > 0) RETURN 1
IF (z > 0 AND x > 100 OR IS_MISSING(asd)) RETURN 2
IF (y > 0) RETURN 3
IF (((x > 0)) AND z > 0) RETURN 4
IF (IS_MISSING(x)) RETURN 5
ELSE RETURN 0`;

// const input = `IF ((x >= 99 AND z > 0)) RETURN 1
// IF (z > 0 AND x > 100 OR IS_MISSING(asd)) RETURN 2
// IF (y > 0) RETURN 3
// IF (((x > 0)) AND z > 0) RETURN 4
// IF (IS_MISSING(x)) RETURN 5
// ELSE RETURN 0`;

// const input = `IF ((x >= 99 AND z > 0)) RETURN 1
// ELSE RETURN 0`;

// const input = `IF ((((x > 0 OR z > 0)) AND IS_MISSING(x) AND (z > 0 OR (x > 0 AND z > 0))) AND y > 0 OR z > 0) RETURN 1
// ELSE RETURN 0`;

// const input = `IF (((((x > 0 AND y > 0))) AND (((((z > 0 AND IS_MISSING(z)))))) AND y > 0)) RETURN 1
// ELSE RETURN 0`

// const input = `IF (x == 0) RETURN 1
// ELSE RETURN 0`;

// const input = `IF ((((x == 98 OR x <= 99)) AND x == 98) OR (y == 2 AND z == 1) AND IS_MISSING(za)) RETURN 1
// ELSE RETURN 0`;

let parserResults = [];

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
try {
  parser.feed(input);
  const { results } = parser;
  parserResults = results;
  const formattedResults = JSON.stringify(results, null, 2);

  fs.writeFile('results.json', formattedResults, err => {
    if (err) console.log(err);
  });

  const command = `nearley-test -i "${input
    .split('\n')
    .join(' ')}" -o analysis.txt grammar.js`;
  exec(command, err => {
    if (err) console.log(err);
  });
} catch (err) {
  console.log('error:', err.message);
}

const [elseStatement, ifStatements] = parserResults[0].reverse();

const evaluation = ifStatements
  .map(x => x[0])
  .map(ifStatement => handleIfExpression(ifStatement, { x: 99, z: 1, y: 1 }));
console.log('evaluation:', evaluation);
console.log('input:', JSON.stringify(input));

function handleIfExpression(
  ifStatement: any[],
  values: { [key: string]: any }
) {
  const [ifToken, expressions, returnStatement] = ifStatement;

  if (ifToken.value !== 'IF')
    throw new Error(
      `Failed to parse IF_EXPRESSION due to invalid token. Got ${
        ifToken.value
      }.`
    );

  const { value } = parseReturnStatement(returnStatement);

  return {
    evaluation: evaluate(reduceExpression(expressions), values),
    value
  };
}

function parseReturnStatement(returnStatement: IReturnStatement) {
  const { returnToken, valueToken } = returnStatement;

  if (returnToken.value !== 'RETURN')
    throw new Error(
      `Failed to parse RETURN_STATEMENT. Got ${returnToken.value}.`
    );

  return {
    keyword: returnToken.value,
    value: +valueToken.value
  };
}

function evaluate(
  logicalExpressions: LogicalExpressions,
  values: { [key: string]: any }
) {
  let expressions = _.cloneDeep(logicalExpressions);
  expressions = !Array.isArray(expressions) ? [expressions] : expressions;

  if (expressions.length === 1) {
    const expression = expressions[0] as
      | ILogicalExpression
      | IMissingLogicalExpression;
    switch (expression.type) {
      case LogicalExpressionTypes.LOGICAL_EXPR:
        return evaluateLogicalExpression(expression, values);
      case LogicalExpressionTypes.IS_MISSING_EXPR:
        return evaluateIsMissingLogicalExpression(expression, values);
    }
  }

  if (expressions.length === 2) {
    return evaluateConditionalExpression(expressions, values);
  }
}

function evaluateConditionalExpression(
  logicalExpressions: LogicalExpressions,
  values: { [key: string]: any }
) {
  let expressions = _.cloneDeep(logicalExpressions) as any;

  const logicalExpression = expressions[0] as LogicalExpressions;
  const conditionalExpression = expressions[1] as IConditionalLogicalExpression;

  switch (conditionalExpression.type) {
    case LogicalExpressionTypes.AND_EXPR:
      return (
        evaluate(logicalExpression, values) &&
        evaluate(conditionalExpression.expression, values)
      );
    case LogicalExpressionTypes.OR_EXPR:
      return (
        evaluate(logicalExpression, values) ||
        evaluate(conditionalExpression.expression, values)
      );
    default:
      throw new Error(
        `Failed to evaluate CONDITIONAL_EXPRESSION due to invalid type. Got ${
          conditionalExpression.type
        }. instead.`
      );
  }
}

function evaluateLogicalExpression(
  expression: ILogicalExpression,
  values: { [key: string]: any }
) {
  const { type, leftOp, rightOp, relationalOp } = expression;

  if (type !== LogicalExpressionTypes.LOGICAL_EXPR)
    throw new Error(
      `Failed to evaluate ${
        LogicalExpressionTypes.LOGICAL_EXPR
      }. Got ${type} instead.`
    );

  const objValue = values[leftOp];

  if (objValue === null || objValue === undefined) {
    throw new Error(
      `Failed to evaluate '${leftOp} ${relationalOp} ${rightOp}'. '${leftOp}' is not defined.`
    );
  }

  switch (relationalOp) {
    case '>':
      return +objValue > +rightOp;
    case '>=':
      return +objValue >= +rightOp;
    case '<':
      return +objValue < +rightOp;
    case '<=':
      return +objValue <= +rightOp;
    case '==':
      return +objValue === +rightOp;
    default:
      throw new Error(
        `Failed to evaluate ${
          LogicalExpressionTypes.LOGICAL_EXPR
        }. '${relationalOp}' is not supported.`
      );
  }
}

function evaluateIsMissingLogicalExpression(
  expression: IMissingLogicalExpression,
  values: { [key: string]: any }
) {
  const { type, identifier } = expression;

  if (type !== LogicalExpressionTypes.IS_MISSING_EXPR)
    throw new Error(
      `Failed to evaluate ${
        LogicalExpressionTypes.IS_MISSING_EXPR
      }. Got ${type} instead.`
    );

  const identifierValue = values[identifier];
  return (
    identifierValue === undefined ||
    identifierValue == 99 ||
    identifierValue == 999
  );
}

function reduceExpression(
  logicalExpression: LogicalExpressions
): LogicalExpressions {
  let expressions = _.cloneDeep(logicalExpression);

  if (Array.isArray(expressions)) {
    if (Array.isArray(expressions[0])) {
      if (expressions.length === 1) {
        expressions = expressions[0] as LogicalExpressions;
        return reduceExpression(expressions);
      } else if (expressions.length === 2) {
        expressions[0] = reduceExpression(expressions[0] as LogicalExpressions);
      }
    }

    if (expressions.length === 2) {
      const conditionalExpression = expressions[1] as IConditionalLogicalExpression;
      if (conditionalExpression.expression) {
        conditionalExpression.expression = reduceExpression(
          conditionalExpression.expression
        ) as LogicalExpressions[];
      }
    }
  }

  return expressions;
}
