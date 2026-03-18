import { Injectable, Logger } from '@nestjs/common';
import * as xpath from 'xpath';
import { DOMParser } from 'xmldom';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  private xmlData: string = `<?xml version="1.0" encoding="UTF-8"?>
  <partners>
    <partner>
      <name>Walter White</name>
      <username>walter100</username>
      <password>Heisenberg123</password>
      <wealth>15M USD</wealth>
    </partner>
    <partner>
      <name>Jesse Pinkman</name>
      <username>dapinkman69</username>
      <password>Yoyo1!</password>
      <wealth>5M USD</wealth>
    </partner>
    <partner>
      <name>Michael Ehrmantraut</name>
      <username>_safetyman_</username>
      <password>LittleKid777</password>
      <wealth>50M USD</wealth>
    </partner>
    <partner>
      <name>Gus Fring</name>
      <username>ChickMan</username>
      <password>GoodChicken4U</password>
      <wealth>Too much USD</wealth>
    </partner>
  </partners>`;

  getPartnersProperties(xpathExpression: string): string {
    this.logger.debug(`Evaluating XPath expression: ${xpathExpression}`);

    try {
      const doc = new DOMParser().parseFromString(this.xmlData);
      const select = xpath.useNamespaces({
        '': 'http://www.w3.org/1999/xhtml'
      });

      // Validate and sanitize the XPath expression
      if (!this.isValidXPath(xpathExpression)) {
        throw new Error('Invalid XPath expression');
      }

      const nodes = select(xpathExpression, doc);
      let result = '';

      for (let i = 0; i < nodes.length; i++) {
        result += nodes[i].toString();
      }

      return result;
    } catch (err) {
      this.logger.error(`Error evaluating XPath: ${err.message}`);
      throw new Error('Failed to evaluate XPath expression');
    }
  }

  private isValidXPath(xpathExpression: string): boolean {
    // Basic validation to prevent XPath injection
    const forbiddenPatterns = [
      /\|/, // Disallow union operator
      /\//, // Disallow direct child or descendant selectors
      /\[.*\]/, // Disallow predicates
      /\(/, // Disallow function calls
      /@/ // Disallow attribute selectors
    ];

    return !forbiddenPatterns.some((pattern) => pattern.test(xpathExpression));
  }
}