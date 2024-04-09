import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BulkUploadComponent } from '../../bulk-upload/bulk-upload.component';

// Component for upload page
@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [BulkUploadComponent],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent {
  EXPORT_URL = environment.exportURL;
  TEMPLATE_SPREADSHEET_URL = environment.templateSpreadSheetURL;
  TEMPLATE_CSV_URL = environment.templateCSVURL;
}
