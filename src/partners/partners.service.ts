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
      <age>50</age>
      <profession>Chemistry Teacher</profession>
      <residency country="US" state="New Mexico" city="Albuquerque"/>
      <username>walter100</username>
      <password>Heisenberg123</password>
      <wealth>15M USD</wealth>
    </partner>
    <partner>
      <name>Jesse Pinkman</name>
      <age>25</age>
      <profession>Professional Product Distributer</profession>
      <residency country="US" state="New Mexico" city="Yo Moma"/>
      <username>dapinkman69</username>
      <password>Yoyo1!</password>
      <wealth>5M USD</wealth>
    </partner>
    <partner>
      <name>Michael Ehrmantraut</name>
      <age>65</age>
      <profession>Personal Security Agent</profession>
      <residency country="US" state="New Mexico" city="Albuquerque"/>
      <username>_safetyman_</username>
      <password>LittleKid777</password>
      <wealth>50M USD</wealth>
    </partner>
    <partner>
      <name>Gus Fring</name>
      <age>52</age>
      <profession>Restaurant Chain Owner</profession>
      <residency country="US" state="New Mexico" city="Albuquerque"/>
      <username>ChickMan</username>
      <password>GoodChicken4U</password>
      <wealth>Too much USD</wealth>
    </partner>
  </partners>`;

  getPartnersProperties(xpathExpression: string): string {
    this.logger.debug(`Evaluating XPath expression: ${xpathExpression}`);

    // Sanitize the XPath expression to prevent injection
    if (!this.isValidXPath(xpathExpression)) {
      throw new Error('Invalid XPath expression.');
    }

    const doc = new DOMParser().parseFromString(this.xmlData);
    const select = xpath.useNamespaces({
      '': 'http://www.w3.org/1999/xhtml'
    });

    try {
      const nodes = select(xpathExpression, doc);
      if (!nodes || nodes.length === 0) {
        throw new Error('No results found for the given XPath expression.');
      }

      return nodes
        .map((node) => node.toString())
        .join('\n');
    } catch (error) {
      this.logger.error(`Error evaluating XPath expression: ${error.message}`);
      throw new Error('Invalid XPath expression.');
    }
  }

  selectPartnerPropertiesByXPATH(username: string, password: string): string {
    // Sanitize inputs to prevent XPath Injection
    if (!this.isValidInput(username) || !this.isValidInput(password)) {
      throw new Error('Invalid input for username or password.');
    }

    const xpathExpression = `//partners/partner[username/text()='${username}' and password/text()='${password}']/*`;
    return this.getPartnersProperties(xpathExpression);
  }

  private isValidInput(input: string): boolean {
    // Allow only alphanumeric characters to prevent injection
    return /^[a-zA-Z0-9]+$/.test(input);
  }

  private isValidXPath(xpath: string): boolean {
    // Basic validation to ensure the XPath does not contain disallowed characters
    // This is a simple example and should be expanded based on actual requirements
    return !/["'|]/.test(xpath);
  }
}