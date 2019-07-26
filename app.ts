/* tslint:disable:no-any no-console triple-equals */

/**
 * ========== Notes ==========
 * As per spec, there's a minimum of 2 portions so the minimum statement
 * is a single IF statement paired with an ELSE statement.
 *
 * IF statements should be in the format:   "IF (<expr>) RETURN <value>"
 * ELSE statement should be in the format:  "ELSE RETURN <value>"
 *
 * There can be multiple IF statements separated by a whitespace (space or newline).
 *
 * All IF statements are evaluated and the latest truthy evaluation will be
 * the final IF statement result. Otherwise, it'll fall back to the ELSE
 * statement. There can only be 1 ELSE statement for every input.
 * For example:
 *    IF (<expr>) RETURN 1  // where expr is FALSE
 *    IF (<expr>) RETURN 2  // where expr is TRUE
 *    IF (<expr>) RETURN 3  // where expr is TRUE
 *    ELSE RETURN 0
 *    => Result would be 3
 *
 *    IF (<expr>) RETURN 1  // where expr is TRUE
 *    IF (<expr>) RETURN 2  // where expr is FALSE
 *    IF (<expr>) RETURN 3  // where expr is TRUE
 *    ELSE RETURN 0
 *    => Result would be 3
 *
 *    IF (<expr>) RETURN 1  // where expr is FALSE
 *    IF (<expr>) RETURN 2  // where expr is FALSE
 *    IF (<expr>) RETURN 3  // where expr is FALSE
 *    ELSE RETURN 0
 *    => Result would be 0
 *
 * ========== Keywords supported ==========
 * IF             - To start an IF statement
 * ELSE           - To start an ELSE statement
 * AND            - AND logical operator
 * OR             - OR logical operator
 * RETURN         - End keyword of every if/else statement followed by a value
 * IS_MISSING(x)  - Check if identifier, 'x' in this case, is missing (undefined, 99, 999)
 * ( or )         - L/R Parenthesis for precedence OR wrapping an expression
 *
 * ========== Operators supported ==========
 * >    -  Greater Than
 * >=   -  Greater Than or Equal
 * <    -  Less Than
 * <=   -  Less Than or Equal
 * ==   -  Is Equal
 *
 * ========== How results are asserted ==========
 * The results are compared against JavaScript's equivalent statement. For example:
 * Values:  { x: 1, y: 1, z: 1 }
 * JS:      (x > 0 && (z > 0 || z > 1))   => True
 * Custom:  (x > 0 AND (y > 0 OR z > 1))  => Should be True as per Operators Precedence of JS
 *
 * ========== Test Cases ==========
 * Values:
 * { x: 99, z: 1, y: 1 }
 *
 * Expressions:
 * IF ((((x > 0 OR z > 0)) AND IS_MISSING(x) AND (z > 0 OR (x > 0 AND z > 0))) AND y > 0 OR z > 0) RETURN 1
 * IF (z > 0 AND x > 100 OR IS_MISSING(asd)) RETURN 2
 * IF (y > 0) RETURN 3
 * IF (((x > 0)) AND z > 0) RETURN 4
 * IF (IS_MISSING(x)) RETURN 5
 * ELSE RETURN 0
 *
 * IF ((x >= 99 AND z > 0)) RETURN 1
 * IF (z > 0 AND x > 100 OR IS_MISSING(asd)) RETURN 2
 * IF (y > 0) RETURN 3
 * IF (((x > 0)) AND z > 0) RETURN 4
 * IF (IS_MISSING(x)) RETURN 5
 * ELSE RETURN 0
 *
 * IF ((x >= 99 AND z > 0)) RETURN 1
 * ELSE RETURN 0
 *
 * IF ((((x > 0 OR z > 0)) AND IS_MISSING(x) AND (z > 0 OR (x > 0 AND z > 0))) AND y > 0 OR z > 0) RETURN 1
 * ELSE RETURN 0
 *
 * IF (((((x > 0 AND y > 0))) AND (((((z > 0 AND IS_MISSING(z)))))) AND y > 0)) RETURN 1
 * ELSE RETURN
 *
 * IF (x == 0) RETURN 1
 * ELSE RETURN 0
 *
 * IF ((((x == 98 OR x <= 99)) AND x == 98) OR (y == 2 AND z == 1) AND IS_MISSING(za)) RETURN 1
 * ELSE RETURN 0
 */

import * as nearley from 'nearley';
import * as _ from 'lodash';
const grammar = require('./grammar');

type IfStatement = [IMooLexerToken, ILogicalExpressions, IReturnStatement];
type ElseStatement = [IMooLexerToken, IReturnStatement];

interface IObject {
  [key: string]: any;
}

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

export const validate = async (input: string) => {
  try {
    // More info @ https://nearley.js.org/docs/parser#catching-errors
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(input);
    const { results } = parser;

    if (results.length === 0) {
      throw new Error('Invalid/Unexpected/Empty input.');
    }

    return results;
  } catch (err) {
    return Promise.reject(err);
  }
};

export const evaluate = async (input: string, values: IObject) => {
  try {
    const results = await validate(input);

    const [ifStatements, elseStatement] = results[0];

    const ifStatementResults: IEvaluationResult[] = ifStatements
      .map((x: any) => x[0]) // Each if statement is wrapped inside an array from nearley parser results as per grammar (see grammar.ne)
      .map((ifStatement: IfStatement) =>
        handleIfExpression(ifStatement, values)
      );
    console.log(ifStatementResults);
    // As per spec, the last truthy evaluation among the sequence will be the result
    // so we reverse the list then find the first truthy evaluation to get the result
    ifStatementResults.reverse();
    const ifStatementResult = ifStatementResults.find(x => x.evaluation);
    const elseStatementResult = handleElseExpression(elseStatement);

    console.log(elseStatementResult);
    return ifStatementResult
      ? ifStatementResult.value
      : elseStatementResult.value;
  } catch (err) {
    return Promise.reject(err);
  }
};

function handleIfExpression(
  ifStatement: IfStatement,
  values: IObject
): IEvaluationResult {
  const [ifToken, expressions, returnStatement] = ifStatement;

  if (ifToken.value !== 'IF') {
    throw new Error(
      `Failed to parse "IF expression" due to invalid token. Got ${
        ifToken.value
      }.`
    );
  }

  const { value } = parseReturnStatement(returnStatement);

  return {
    evaluation: evaluateExpression(reduceExpression(expressions), values),
    value
  };
}

function handleElseExpression(elseStatement: ElseStatement): IEvaluationResult {
  const [elseToken, returnStatement] = elseStatement;

  if (elseToken.value !== 'ELSE') {
    throw new Error(
      `Failed to parse "ELSE expression" due to invalid token. Got "${
        elseToken.value
      }" instead.`
    );
  }

  const { value } = parseReturnStatement(returnStatement);

  return {
    evaluation: true,
    value
  };
}

function parseReturnStatement(returnStatement: IReturnStatement) {
  const { returnToken, valueToken } = returnStatement;

  if (returnToken.value !== 'RETURN') {
    throw new Error(
      `Failed to parse RETURN_STATEMENT. Got "${returnToken.value}" instead.`
    );
  }

  return {
    keyword: returnToken.value,
    value: +valueToken.value
  };
}

function evaluateExpression(
  logicalExpressions: ILogicalExpressions,
  values: IObject
): boolean {
  let expressions = _.cloneDeep(logicalExpressions);
  expressions = !Array.isArray(expressions) ? [expressions] : expressions;

  if (expressions.length === 1) {
    const expression = expressions[0] as
      | IRelationalExpression
      | IMissingLogicalExpression;
    switch (expression.type) {
      case LogicalExpressionTypes.RELATIONAL_EXPR:
        return evaluateRelationalExpression(expression, values);
      case LogicalExpressionTypes.IS_MISSING_EXPR:
        return evaluateIsMissingLogicalExpression(expression, values);
    }
  }

  if (expressions.length === 2) {
    return evaluateConditionalExpression(expressions, values);
  }

  throw new Error(
    `Failed to evaluate expression. Got expression length of ${
      expressions.length
    }.`
  );
}

function evaluateConditionalExpression(
  logicalExpressions: ILogicalExpressions,
  values: IObject
): boolean {
  const expressions = _.cloneDeep(logicalExpressions) as any;

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
        `Failed to evaluate CONDITIONAL_EXPRESSION due to invalid type. Got "${
          conditionalExpression.type
        }" instead.`
      );
  }
}

/**
 * Evaluate relational expression.
 *
 * @example
 * x > 1
 * x == 2
 * x <= 3
 *
 * @param expression Relational expression
 * @param values Key-Value pair of identifier values
 */
function evaluateRelationalExpression(
  expression: IRelationalExpression,
  values: IObject
): boolean {
  const { type, leftOp, rightOp, relationalOp } = expression;

  if (type !== LogicalExpressionTypes.RELATIONAL_EXPR) {
    throw new Error(
      `Failed to evaluate ${
        LogicalExpressionTypes.RELATIONAL_EXPR
      }. Got ${type} instead.`
    );
  }

  const objValue = values[leftOp];

  if (objValue === null || objValue === undefined) {
    throw new Error(
      `Failed to evaluate "${leftOp} ${relationalOp} ${rightOp}". "${leftOp}" is not defined.`
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
        }. "${relationalOp}" is not supported.`
      );
  }
}

/**
 * Check if the given expression identifier does not exist (`undefined`) on `values` or is either `99` or `999`.
 *
 * @param expression Missing logical expression: `IS_MISSING()`
 * @param values Key-Value pair of identifier values
 */
function evaluateIsMissingLogicalExpression(
  expression: IMissingLogicalExpression,
  values: IObject
) {
  const { type, identifier } = expression;

  if (type !== LogicalExpressionTypes.IS_MISSING_EXPR) {
    throw new Error(
      `Failed to evaluate ${
        LogicalExpressionTypes.IS_MISSING_EXPR
      }. Got "${type}" instead.`
    );
  }

  const identifierValue = values[identifier];
  return (
    identifierValue == undefined ||
    identifierValue == 99 ||
    identifierValue == 999
  );
}

/**
 * This utility function is meant to reduce the redundancy of the expressions.
 * `((((((x > 0)))) AND y > 0))` will become `(x > 0 AND y > 0)`.
 *
 * @param logicalExpression List of logical expressions
 */
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

const variables = {
  x: 99,
  y: 50,
  z: 25
};

const expression = `IF (x > 99) RETURN 1 
IF (x >= 99) RETURN 2
IF (IS_MISSING(x)) RETURN 3
IF (((((x > 99 AND IS_MISSING(x)))))) RETURN 4
IF ((x > 99 OR IS_MISSING(x)) AND z > 0) RETURN 5
ELSE RETURN 0
`;

evaluate(expression, variables)
  .then(console.log)
  .catch(console.error);
