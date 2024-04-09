import { Injectable } from '@angular/core';
import * as Yup from 'yup';
import { environment } from '../../environments/environment';

const ENTRY_VALIDATION_PATH = environment.entryValidationPath;

export type ValidationErrorInfo = {
  column: string;
  error: string;
}

// Accepted value types for validation: list means the value must be in the list, date means the value must be a date, numeric means the value must be a number, alphanumeric means the value must be a string containing only letters and numbers
export type ValidationType = "string" | "list" | "date" | "numeric" | "alphanumeric";

// ValidationValue is the schema for each column in the entry validation JSON schema
export type ValidationValue = {
    type: ValidationType;
    required?: boolean;
    length?: number;
    min?: number;
    max?: number;
    minDate?: string;
    maxDate?: string;
    list?: string[];
    regex?: string;
    email?: boolean;
    format?: string;
    error?: string;
}

export type ValidationData = Record<string, ValidationValue>

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  columns: string[];
  validationData: ValidationData | null;
  didGetValidation: boolean;
  schemaObject: Record<string, Yup.StringSchema<string | undefined> | Yup.NumberSchema<number | undefined> | Yup.DateSchema>;
  constructor() {
    this.columns = [];
    this.validationData = null;
    this.didGetValidation = false;
    this.schemaObject = {};
  }

  // Get validation data from the JSON file
  private async _getValidation() {
    this.didGetValidation = true;
    try {
        const { columns, ...validationData } = await (await fetch(ENTRY_VALIDATION_PATH)).json();
        this.columns = columns;
        this.validationData = validationData;
        this.schemaObject = this._getSchema();
        return {
            success: true,
        }
    } catch (error) {
        return {
            success: false,
            error
        }
    }
  }

  // Public wrapper for _getValidation
  public async getValidation() {
    if(this.didGetValidation) {
        return {
            success: true,
        }
    } else {
        const res = await this._getValidation();
        this.didGetValidation = res.success;
        return res;
    }
  }

  // Get the schema object for the validation data
  private _getSchema() {
    const schema: Record<string, Yup.StringSchema<string | undefined> | Yup.DateSchema | Yup.NumberSchema<number | undefined>> = {};
    this.columns.forEach(column =>  {
        if(!this.validationData) {
            throw Error(`Validation data not found for ${column}.`)
        }
        schema[column] = this._getSchemaPropertiesByColumn(this.validationData[column]);
    });
    return schema;
  }

  // Validate each column in the entry
  private async _validateEntry(entry: Record<string, string | number>) {
    const errors: ValidationErrorInfo[] = [];
    if(!this.validationData) {
        throw Error(`Validation data not found.`);
    }
    this.columns.forEach(async (column) => {
        try {
            await this.schemaObject[column].validate(entry[column]);
        } catch (error) {
            errors.push({
                column,
                error: String(error)
            });
        }
    })
    return errors;
  }

  // Public wrapper for _validateEntry
  public async validateEntry(entry: Record<string, string | number>) {
    if(!this.didGetValidation) {
        await this.getValidation();
    }
    return await this._validateEntry(entry);
  }

  // Get the schema properties of a column
  private _getSchemaPropertiesByColumn(validationValue: ValidationValue) {
    let schemaProperties;

    switch(validationValue.type) {
        case "string": {
            schemaProperties = this._getSchemaPropertiesOfString(validationValue);
            break;
        }
        case "list": {
            schemaProperties = this._getSchemaPropertiesOfList(validationValue);
            break;
        }
        case "date": {
            schemaProperties = this._getSchemaPropertiesOfDate(validationValue);
            break;
        }
        case "numeric": {
            schemaProperties = this._getSchemaPropertiesOfNumeric(validationValue);
            break;
        }
        case "alphanumeric": {
            schemaProperties = this._getSchemaPropertiesOfAlphanumeric(validationValue);
            break;
        }
        default: {
            throw Error(`Validation type ${validationValue.type} not found`);
        }
    }
    
    if(validationValue.required)
        schemaProperties = schemaProperties.required("Value is required");

    return schemaProperties;
  }

  private _getSchemaPropertiesOfString(validationValue: ValidationValue) {
    let schemaProperties = Yup.string();
    if(validationValue.length)
        schemaProperties = schemaProperties.length(validationValue.length, validationValue.error);
    if(validationValue.min)
        schemaProperties = schemaProperties.min(validationValue.min, validationValue.error);
    if(validationValue.max)
        schemaProperties = schemaProperties.max(validationValue.max, validationValue.error);
    if(validationValue.regex)
        schemaProperties = schemaProperties.matches(new RegExp(validationValue.regex), validationValue.error ?? "Value does not match regex");
    if(validationValue.email)
        schemaProperties = schemaProperties.email(validationValue.error ?? "Value is not a valid email");
    return schemaProperties;
  }

  private _getSchemaPropertiesOfList(validationValue: ValidationValue) {
    if(!validationValue.list)
        throw Error(`List validation type requires a list`);
    return Yup.string().oneOf(validationValue.list, validationValue.error ?? "Value is not in list");
  }

  private _getSchemaPropertiesOfDate(validationValue: ValidationValue) {
    let schemaProperties;
    if(validationValue.format === 'DD/MM/YYYY') {
        schemaProperties = Yup.string().test('is-date', validationValue.error ?? "Value is not a valid date", (value) => {
            if(value) {
                const date = value.split('/');
                if (date.length !== 3 || date[0].length !== 2 || date[1].length !== 2 || date[2].length !== 4) {
                    return false;
                }
                if(new Date(Number(date[2]), Number(date[1]) - 1, Number(date[0])).toString() === 'Invalid Date') {
                    return false;
                }
            }
            return true;
        })
        if(validationValue.minDate) {
            schemaProperties = schemaProperties.test('min', validationValue.error ?? 'Value does not adhere to minimum date', ((min) => (value) => {
                if(value) {
                    const minDate = min.split('/');
                    const date = value.split('/');
                    if(new Date(Number(date[2]), Number(date[1]) - 1, Number(date[0])) < new Date(Number(minDate[2]), Number(minDate[1]) - 1, Number(minDate[0]))){
                        return false;
                    }
                }
                return true;
            })(validationValue.minDate));
        }
        if(validationValue.maxDate) {
            const maxDate = validationValue.maxDate;
            schemaProperties = schemaProperties.test('min', validationValue.error ?? 'Value does not adhere to minimum date', ((max) => (value) => {
                if(value) {
                    const maxDate = max.split('/');
                    const date = value.split('/');
                    if(new Date(Number(date[2]), Number(date[1]) - 1, Number(date[0])) < new Date(Number(maxDate[2]), Number(maxDate[1]) - 1, Number(maxDate[0]))){
                        return false;
                    }
                }
                return true;
            })(validationValue.maxDate));
        }
    } else {
        schemaProperties = Yup.date();
        if(validationValue.minDate)
            schemaProperties = schemaProperties.min(validationValue.minDate, validationValue.error);
        if(validationValue.max)
            schemaProperties = schemaProperties.max(validationValue.maxDate, validationValue.error);
    }
    return schemaProperties;
  }

  private _getSchemaPropertiesOfNumeric(validationValue: ValidationValue) {
    let schemaProperties = Yup.number();
    if(validationValue.min)
        schemaProperties = schemaProperties.min(validationValue.min, validationValue.error);
    if(validationValue.max)
        schemaProperties = schemaProperties.max(validationValue.max, validationValue.error);
    return schemaProperties;
  }

  private _getSchemaPropertiesOfAlphanumeric(validationValue: ValidationValue) {
    let schemaProperties = Yup.string().matches(/^[a-zA-Z0-9]*$/, "Value is not alphanumeric");
    if(validationValue.length)
        schemaProperties = schemaProperties.length(validationValue.length, validationValue.error);
    if(validationValue.min)
        schemaProperties = schemaProperties.min(validationValue.min, validationValue.error);
    if(validationValue.max)
        schemaProperties = schemaProperties.max(validationValue.max, validationValue.error);
    return schemaProperties;
  }
}
