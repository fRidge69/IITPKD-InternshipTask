import { Component, Input } from '@angular/core';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { DataRecord } from '../../bulk-upload/bulk-upload.component';
import { ErrorModalComponent } from '../modal/error-modal/error-modal.component';

@Component({
  selector: 'app-preview-table',
  standalone: true,
  imports: [ErrorModalComponent, NgbPagination],
  templateUrl: './preview-table.component.html',
  styleUrl: './preview-table.component.css'
})
export class PreviewTableComponent {
  @Input() uploadedData: DataRecord[] = [];
  @Input() columns: string[] =[];
  @Input() revalidateEntry: (entry: typeof this.uploadedData[number]) => void = () => {};

  openedError?: {
    uploadedDataRecord: DataRecord;
    column: string;
  } = undefined
  setOpenedError = (uploadedDataRecord: DataRecord, column: string) => {
    this.openedError = {
      uploadedDataRecord,
      column
    }
  }
  resetOpenedError = () => {
    this.openedError = undefined;
  }
  // To change the value of a column
  changeColValue(uploadedDataRecord: typeof this.uploadedData[number], column: string, value: string | number) {
    uploadedDataRecord.data[column] = value;
    uploadedDataRecord.hasValidated = false;

    this.revalidateEntry(uploadedDataRecord)
  }
  uploadedDataHasNoErrors() {
    return this.uploadedData.every((data) => data.errors.length === 0);
  }
  getSubmitHandler = (uploadedDataRecord: typeof this.uploadedData[number], column: string) => {
    return (value: string | number) => {
      this.changeColValue(uploadedDataRecord, column, value);
      this.resetOpenedError();
    }
  }

  // To check if a column has an error
  columnHasError(uploadedDataRecord: typeof this.uploadedData[number], column: string) {
    return uploadedDataRecord.errors.some((error) => error.column === column);
  }

  // To get the error for a column
  getColumnError(uploadedDataRecord: typeof this.uploadedData[number], column: string) {
    return uploadedDataRecord.errors.find((error) => error.column === column)?.error;
  }

  
  searchTerm: string = '';
  setSearchTerm(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value ?? ''
  }
  showErrorsOnly: boolean = false;
  setShowErrorsOnly(event: Event) {
    this.showErrorsOnly = (event.target as HTMLInputElement).checked ?? false;
  }
  
  getUploadedDataToDisplay() {
    let uploadedData = this.uploadedData;
    if(this.showErrorsOnly) {
      uploadedData = this.uploadedData.filter((data) => data.errors.length > 0);
    }
    if(this.searchTerm) {
      uploadedData = uploadedData.filter((data) => Object.values(data.data).some(data => String(data).toLowerCase().startsWith(this.searchTerm.toLowerCase())));
    }
    return uploadedData;
  }

  page = 1;
  pageSizes = [5, 10, 20, 25, 50, 100];
  pageSize = 10;
  setPageSize(event: Event) {
    this.pageSize = parseInt((event.target as HTMLSelectElement).value);
  }
  getPaginatedDataToDisplay() {
    return this.getUploadedDataToDisplay().slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  
  currentSort = {
    column: '',
    order: 'asc'
  };
  sortData(column: string) {
    if(this.currentSort.column === column) {
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.order = 'asc';
    }

    this.uploadedData.sort((a, b) => {
      if(a.data[column] === b.data[column]) {
        return 0;
      } else if(a.data[column] > b.data[column]) {
        return this.currentSort.order === 'asc' ? 1 : -1;
      } else {
        return this.currentSort.order === 'asc' ? -1 : 1;
      }
    });
  }
  sortDataByID() {
    this.uploadedData.sort((a, b) => a.id - b.id);
  }
}
