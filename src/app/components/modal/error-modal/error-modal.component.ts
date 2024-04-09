import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [],
  templateUrl: './error-modal.component.html',
  styleUrl: './error-modal.component.css'
})
export class ErrorModalComponent {
  @Input() column: string = '';
  @Input() errorMessage?: string = '';
  @Input() handleSubmit: (value: string | number) => void = () => {};
  @Input() handleClose: () => void = () => {};
  @Input() value: string | number = '';

  handleInputChange(event: Event) {
    this.value = (event.target as HTMLInputElement).value;
  }
}
