import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PaymentFormComponent } from './payment-form/payment-form.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PaymentFormComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Payment Gateway';
}
