import Helper from '@ember/component/helper';
import { isEmpty } from '@ember/utils';
import { lexer, parse, walk, property as propertyName } from 'css-tree';

const syntax = lexer;

function isTargetError(error) {
  if (!error) {
    return null;
  }

  if (
    error.name !== 'SyntaxError' &&
    error.name !== 'SyntaxMatchError' &&
    error.name !== 'SyntaxReferenceError'
  ) {
    return null;
  }

  return error;
}

function validateAtrule(node) {
  const atrule = node.name;
  const errors = [];
  let error;

  if ((error = isTargetError(syntax.checkAtruleName(atrule)))) {
    errors.push(
      Object.assign(error, {
        atrule,
        ...(node.loc && node.loc.start),
      }),
    );

    return errors;
  }

  errors.push(
    ...validateAtrulePrelude(
      atrule,
      node.prelude,
      (node.prelude && node.prelude.loc && node.prelude.loc.start) ||
        (node.loc && node.loc.start),
    ),
  );

  if (node.block && node.block.children) {
    node.block.children.forEach((child) => {
      if (child.type === 'Declaration') {
        errors.push(
          ...validateAtruleDescriptor(
            atrule,
            child.property,
            child.value,
            child.loc && child.loc.start,
          ),
        );
      }
    });
  }

  return errors;
}

function validateAtrulePrelude(atrule, prelude, preludeLoc) {
  const errors = [];
  let error;

  if ((error = isTargetError(syntax.checkAtrulePrelude(atrule, prelude)))) {
    errors.push(
      Object.assign(error, {
        atrule,
        ...preludeLoc,
      }),
    );
  } else if (
    (error = isTargetError(syntax.matchAtrulePrelude(atrule, prelude).error))
  ) {
    errors.push(
      Object.assign(error, {
        atrule,
        ...(error.rawMessage === 'Mismatch' && {
          details: error.message,
          message: 'Invalid value for `@' + atrule + '` prelude',
        }),
      }),
    );
  }

  return errors;
}

function validateAtruleDescriptor(atrule, descriptor, value, descriptorLoc) {
  const errors = [];
  let error;

  if (
    (error = isTargetError(
      syntax.checkAtruleDescriptorName(atrule, descriptor),
    ))
  ) {
    errors.push(
      Object.assign(error, {
        atrule,
        descriptor,
        ...descriptorLoc,
      }),
    );
  } else {
    if (
      (error = isTargetError(
        syntax.matchAtruleDescriptor(atrule, descriptor, value).error,
      ))
    ) {
      errors.push(
        Object.assign(error, {
          atrule,
          descriptor,
          ...(error.rawMessage === 'Mismatch' && {
            details: error.message,
            message: 'Invalid value for `' + descriptor + '` descriptor',
          }),
        }),
      );
    }
  }

  return errors;
}

function validateDeclaration(property, value, valueLoc) {
  const errors = [];
  let error;

  if (propertyName(property).custom) {
    return errors;
  }

  if ((error = isTargetError(syntax.checkPropertyName(property)))) {
    errors.push(
      Object.assign(error, {
        property,
        ...valueLoc,
      }),
    );
  } else if (
    (error = isTargetError(syntax.matchProperty(property, value).error))
  ) {
    errors.push(
      Object.assign(error, {
        property,
        ...(error.rawMessage === 'Mismatch' && {
          details: error.message,
          message: 'Invalid value for `' + property + '` property',
        }),
      }),
    );
  }

  return errors;
}

function validateRule(node) {
  const errors = [];

  if (node.block && node.block.children) {
    node.block.children.forEach((child) => {
      if (child.type === 'Declaration') {
        errors.push(
          ...validateDeclaration(
            child.property,
            child.value,
            child.loc && child.loc.start,
          ),
        );
      }
    });
  }

  return errors;
}

function validate(css, filename) {
  const errors = [];
  const ast =
    typeof css !== 'string'
      ? css
      : parse(css, {
          filename,
          positions: true,
          parseAtrulePrelude: false,
          parseRulePrelude: false,
          parseValue: false,
          parseCustomProperty: false,
          onParseError(error) {
            errors.push(error);
          },
        });

  walk(ast, {
    visit: 'Atrule',
    enter(node) {
      errors.push(...validateAtrule(node));
    },
  });

  walk(ast, {
    visit: 'Rule',
    enter(node) {
      errors.push(...validateRule(node));
    },
  });

  return errors;
}

export default class ValidCss extends Helper {
  compute(params, hash) {
    if (isEmpty(params[0])) {
      return;
    }

    let preview = false;
    if (hash.preview) {
      preview = true;
    }

    let csscontent = params[0];
    let result = validate(csscontent);
    if (result.length > 0) {
      return;
    }

    let phase1 = csscontent.split('}');
    let rules = [];
    phase1.forEach((rule) => {
      if (rule.trim()) {
        if (preview) {
          rule = '#OlPeview ' + rule.trim() + '}';
        } else {
          rule = rule.trim() + '}';
        }
        rules.push(rule.replace(/\r?\n|\r/g, ''));
      } else {
        if (rule) {
          rules.push(rule);
        }
      }
    });

    // console.log(rules);
    return rules.join('\n');
  }
}
