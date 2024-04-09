import { Component, Input } from '@angular/core';
import { environment } from '../../environments/environment';
import { ValidationErrorInfo, ValidationService } from '../validation/validation.service';
import { read, utils, writeFile } from 'xlsx';
import { NgbDropdownModule, NgbProgressbarModule, NgbToast, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { PreviewTableComponent } from '../components/preview-table/preview-table.component';
import { UploadFileComponent } from '../components/upload-file/upload-file.component';

export type DataRecord = {
  id: number;
  data: Record<string, string | number>;
  errors: ValidationErrorInfo[];
  hasValidated?: boolean;
  isLoading?: boolean;
}

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [UploadFileComponent, PreviewTableComponent, NgbToast, NgbTooltip, NgbDropdownModule, NgbProgressbarModule],
  templateUrl: './bulk-upload.component.html',
  styleUrl: './bulk-upload.component.css'
})
export class BulkUploadComponent {
  @Input() EXPORT_URL = '';
  @Input() TEMPLATE_SPREADSHEET_URL = '';
  @Input() TEMPLATE_CSV_URL = '';

  currentStep = 1;
  uploadedData: DataRecord[];
  columns: string[] = [];
  showToast: boolean = false;

  exportProgress = 0;

  isExporting: boolean = false;

  constructor(private validationService: ValidationService) {
    this.uploadedData = [];
    this.validationService.getValidation().then(() => {
      this.columns = this.validationService.columns;
    });
  }

  setCurrentStep(step: number) {
    this.currentStep = step;
  }

  onFileUpload = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.item(0);
    if (!file) {
      return;
    }

    const uploadedData: Record<string, string | number>[] = await this._getUploadedData(file);

    if (this.uploadedData.length > 0) {
      this.uploadedData = this.getMergedUploadedData(uploadedData);
    } else {
      this.uploadedData = uploadedData.map((data, index) => ({
        id: index + 1,
        data,
        errors: [],
        isLoading: true
      }));
    }
    this.setCurrentStep(2);

    this.uploadedData.forEach(async (entry) => {
      entry.errors = await this.validationService.validateEntry(entry.data);
      entry.hasValidated = true;
      entry.isLoading = false;
    });

    this.showToast = true;
  }

  private async _getUploadedData(file: File) {
    const workbook = read(await file.arrayBuffer(), { cellDates: true });
    const uploadedData: Record<string, string | number | Date>[] = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const uploadedStringData: Record<string, string | number>[] = uploadedData.map((data) => {
      const stringData: Record<string, string | number> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof Date && (!this.validationService.validationData || this.validationService.validationData[key].type === 'date')) {
          stringData[key] = value.toDateString();
          return;
        } else if (value instanceof Date) {
          stringData[key] = value.toString();
          return;
        }
        stringData[key] = value;
      });
      return stringData;
    })
    return uploadedStringData;
  }

  getMergedUploadedData(uploadedData: Record<string, string | number>[]) {
    const mergedUploadedData: typeof this.uploadedData = []

    let i = 0, j = 0;
    while (i < this.uploadedData.length && j < uploadedData.length) {
      if (Number(uploadedData[j]['id']) === i + 1) {
        const { id, ...data } = uploadedData[j]
        mergedUploadedData.push({
          id: i + 1,
          data,
          errors: [],
          isLoading: true
        });
        j++;
        i++;
      } else {
        mergedUploadedData.push({
          id: i + 1,
          data: this.uploadedData[i].data,
          errors: this.uploadedData[i].errors,
          isLoading: this.uploadedData[i].isLoading
        });
        i++;
      }
    }
    if (i >= this.uploadedData.length) {
      while (j < uploadedData.length) {
        const { id, ...data } = uploadedData[j]
        mergedUploadedData.push({
          id: i + 1,
          data: data,
          errors: [],
          isLoading: true
        });
        j++;
        i++;
      }
    } else {
      while (i < this.uploadedData.length) {
        mergedUploadedData.push({
          id: i + 1,
          data: this.uploadedData[i].data,
          errors: this.uploadedData[i].errors,
          isLoading: this.uploadedData[i].isLoading
        });
        i++;
      }
    }
    return mergedUploadedData;
  }

  revalidateEntry = async (entry: typeof this.uploadedData[number]) => {
    entry.isLoading = true;
    entry.errors = await this.validationService.validateEntry(entry.data);
    entry.isLoading = false;
    entry.hasValidated = true;
    this.showToast = true;
  }


  uploadedDataHasNoErrors() {
    return this.uploadedData.every((data) => data.errors.length === 0);
  }

  getAllErrorEntries() {
    return this.uploadedData.filter((data) => data.errors.length > 0);
  }

  getTotalErrors() {
    return this.uploadedData.reduce((acc, data) => acc + data.errors.length, 0);
  }

  getErrorEntrySheet(extension: 'xlsx' | 'csv') {
    const worksheet = utils.json_to_sheet(this.getAllErrorEntries().map((entry) => ({ id: entry.id, ...entry.data })));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'errors');
    writeFile(workbook, `errors.${extension}`, { compression: true });
  }

  getExportData() {
    return this.uploadedData.filter((data) => data.hasValidated && data.errors.length === 0).map((data) => data.data);
  }

  private async _exportDataByPost(exportData: Record<string, string | number>[]) {
    const result = await fetch(this.EXPORT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exportData)
    })
    return result.ok;
  }

  private _exportAsJSON(exportData: Record<string, string | number>[]) {
    const jsonData = JSON.stringify(exportData);
    this._downloadFile(jsonData, 'data.json', 'application/json');
  }


  private _downloadFile(content: any, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  async exportData(exportData: Record<string, string | number>[]) {
    const shouldExportData = window.confirm('Are you sure you want to export the data?');
    if (!shouldExportData) {
      return;
    }
    this.currentStep = 4;
    this.isExporting = true;
    this._startProgress();

    // !!! TODO: This is the line for production :
    // const result = await this._exportDataByPost(exportData);

    // !!! TODO: DELETE vvvv
    if (!environment.production)
      this._exportAsJSON(exportData);
    const result = true;
    // !!! TODO: DELETE ^^^^
    this._setProgress(100);

    if (!result) {
      alert('Data export failed');
      this.currentStep = 3;
    } else {
      this.isExporting = false;
      this.uploadedData = [];
    }
  }

  private _setProgress(progress: number) {
    this.exportProgress = progress;
  }
  private _startProgress = () => {
    this.exportProgress = 0;
    const interval = setInterval(() => {
      this.exportProgress += 1;
      if (this.exportProgress >= 95) {
        clearInterval(interval);
      }
    }, 100);
  }
}
