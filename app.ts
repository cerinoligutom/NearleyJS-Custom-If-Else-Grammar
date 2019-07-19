import * as nearley from 'nearley';
const grammar = require('./grammar');
import * as _ from 'lodash';

type IfStatement = [IMooLexerToken, ILogicalExpressions, IReturnStatement];
type ElseStatement = [IMooLexerToken, IReturnStatement];

interface IEvaluationResult {
  evaluation: boolean;
  value: any;
}

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

interface ILogicalExpressions
  extends Array<
    | ILogicalExpressions
    | IRelationalExpression
    | IConditionalExpression
    | IMissingLogicalExpression
  > {}

interface IRelationalExpression {
  type: LogicalExpressionTypes.RELATIONAL_EXPR;
  leftOp: string;
  relationalOp: string;
  rightOp: string;
}

interface IConditionalExpression {
  type: LogicalExpressionTypes.AND_EXPR | LogicalExpressionTypes.OR_EXPR;
  logicalOp: string;
  expression: ILogicalExpressions[];
}

interface IMissingLogicalExpression {
  type: LogicalExpressionTypes.IS_MISSING_EXPR;
  identifier: string;
}

interface IReturnStatement {
  returnToken: IMooLexerToken;
  valueToken: IMooLexerToken;
}

enum LogicalExpressionTypes {
  RELATIONAL_EXPR = 'RELATIONAL_EXPRESSION',
  AND_EXPR = 'AND_LOGICAL_EXPRESSION',
  OR_EXPR = 'OR_LOGICAL_EXPRESSION',
  IS_MISSING_EXPR = 'IS_MISSING_LOGICAL_EXPRESSION'
}

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
export const evaluate = async (input: string = '') => {
  try {
    parser.feed(input);
    const { results } = parser;

    if (results.length === 0)
      throw new Error('Invalid/Unexpected/Empty input.');

    let [ifStatements, elseStatement] = results[0];

    const ifStatementResults: IEvaluationResult[] = ifStatements
      .map(x => x[0] as IfStatement) // Each if statement is wrapped inside an array from nearley parser results
      .map(ifStatement =>
        handleIfExpression(ifStatement, { x: 99, z: 1, y: 1 })
      );
    // As per spec, the last truthy evaluation among the sequence will be the result
    // so we reverse the list then find the first truthy evaluation to get the result
    ifStatementResults.reverse();
    const ifStatementResult = ifStatementResults.find(x => x.evaluation);
    const elseStatementResult = handleElseExpression(elseStatement);

    if (ifStatementResult) {
      return ifStatementResult.value;
    } else {
      return elseStatementResult.value;
    }
  } catch (err) {
    console.log('error:', err.message);
    return Promise.reject(err);
  }
};

function handleIfExpression(
  ifStatement: IfStatement,
  values: { [key: string]: any }
): IEvaluationResult {
  const [ifToken, expressions, returnStatement] = ifStatement;

  if (ifToken.value !== 'IF')
    throw new Error(
      `Failed to parse "IF expression" due to invalid token. Got ${
        ifToken.value
      }.`
    );

  const { value } = parseReturnStatement(returnStatement);

  return {
    evaluation: evaluateExpression(reduceExpression(expressions), values),
    value
  };
}

function handleElseExpression(elseStatement: ElseStatement): IEvaluationResult {
  const [elseToken, returnStatement] = elseStatement;

  if (elseToken.value !== 'ELSE')
    throw new Error(
      `Failed to parse "ELSE expression" due to invalid token. Got ${
        elseToken.value
      }.`
    );

  const { value } = parseReturnStatement(returnStatement);

  return {
    evaluation: true,
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

function evaluateExpression(
  logicalExpressions: ILogicalExpressions,
  values: { [key: string]: any }
) {
  let expressions = _.cloneDeep(logicalExpressions);
  expressions = !Array.isArray(expressions) ? [expressions] : expressions;

  if (expressions.length === 1) {
    const expression = expressions[0] as
      | IRelationalExpression
      | IMissingLogicalExpression;
    switch (expression.type) {
      case LogicalExpressionTypes.RELATIONAL_EXPR:
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
  logicalExpressions: ILogicalExpressions,
  values: { [key: string]: any }
) {
  let expressions = _.cloneDeep(logicalExpressions) as any;

  const logicalExpression = expressions[0] as ILogicalExpressions;
  const conditionalExpression = expressions[1] as IConditionalExpression;

  switch (conditionalExpression.type) {
    case LogicalExpressionTypes.AND_EXPR:
      return (
        evaluateExpression(logicalExpression, values) &&
        evaluateExpression(conditionalExpression.expression, values)
      );
    case LogicalExpressionTypes.OR_EXPR:
      return (
        evaluateExpression(logicalExpression, values) ||
        evaluateExpression(conditionalExpression.expression, values)
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
  expression: IRelationalExpression,
  values: { [key: string]: any }
) {
  const { type, leftOp, rightOp, relationalOp } = expression;

  if (type !== LogicalExpressionTypes.RELATIONAL_EXPR)
    throw new Error(
      `Failed to evaluate ${
        LogicalExpressionTypes.RELATIONAL_EXPR
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
          LogicalExpressionTypes.RELATIONAL_EXPR
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
  logicalExpression: ILogicalExpressions
): ILogicalExpressions {
  let expressions = _.cloneDeep(logicalExpression);

  if (Array.isArray(expressions)) {
    if (Array.isArray(expressions[0])) {
      if (expressions.length === 1) {
        expressions = expressions[0] as ILogicalExpressions;
        return reduceExpression(expressions);
      } else if (expressions.length === 2) {
        expressions[0] = reduceExpression(
          expressions[0] as ILogicalExpressions
        );
      }
    }

    if (expressions.length === 2) {
      const conditionalExpression = expressions[1] as IConditionalExpression;
      if (conditionalExpression.expression) {
        conditionalExpression.expression = reduceExpression(
          conditionalExpression.expression
        ) as ILogicalExpressions[];
      }
    }
  }

  return expressions;
}

const input = `IF ((((x > 0 OR z > 0)) AND IS_MISSING(x) AND (z > 0 OR (x > 0 AND z > 0))) AND y > 0 OR z > 0) RETURN 1
IF (z > 0 AND x > 100 OR IS_MISSING(asd)) RETURN 2
IF (y > 0) RETURN 3
IF (((x > 0)) AND z > 0) RETURN 4
IF (IS_MISSING(x)) RETURN 5
ELSE RETURN 0`;

evaluate(input)
  .then(val => {
    console.log('evaluated:', val);
  })
  .catch(err => {
    console.error('evaluation error:', err);
  });
