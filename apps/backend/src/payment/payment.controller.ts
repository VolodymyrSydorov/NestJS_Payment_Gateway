import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  HttpStatus, 
  HttpException,
  Logger,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { PaymentRequest, PaymentResponse, BankId } from '@nestjs-payment-gateway/shared';
import { PaymentService } from './payment.service';

/**
 * Payment Controller
 * REST API endpoints for payment gateway operations
 * 
 * Endpoints:
 * - POST /payments - Process payment with specified bank
 * - POST /payments/auto - Process payment with automatic bank selection
 * - GET /payments/methods - Get available payment methods
 * - GET /payments/health - Get gateway health status
 * - GET /payments/statistics - Get processing statistics
 * - PUT /payments/processors/:bankId/enable - Enable processor
 * - PUT /payments/processors/:bankId/disable - Disable processor
 * - GET /payments/connectivity - Test processor connectivity
 */
@Controller('payments')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {
    this.logger.log('Payment Controller initialized');
  }

  /**
   * Process a payment with specified bank
   * POST /payments
   */
  @Post()
  async processPayment(@Body() paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Received payment request: ${paymentRequest.amount} ${paymentRequest.currency} via ${paymentRequest.bankId}`);
    
    try {
      const result = await this.paymentService.processPayment(paymentRequest);
      
      this.logger.log(`Payment processed: ${result.transactionId} - ${result.status}`);
      return result;
      
    } catch (error) {
      this.logger.error(`Payment processing failed: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Process a payment with automatic bank selection
   * POST /payments/auto
   */
  @Post('auto')
  async processPaymentAuto(@Body() paymentRequest: Omit<PaymentRequest, 'bankId'>): Promise<PaymentResponse> {
    this.logger.log(`Received auto payment request: ${paymentRequest.amount} ${paymentRequest.currency}`);
    
    try {
      const result = await this.paymentService.processPaymentAuto(paymentRequest);
      
      this.logger.log(`Auto payment processed: ${result.transactionId} - ${result.status} via ${result.bankId}`);
      return result;
      
    } catch (error) {
      this.logger.error(`Auto payment processing failed: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Get all available payment methods
   * GET /payments/methods
   */
  @Get('methods')
  getAvailablePaymentMethods() {
    this.logger.debug('Getting available payment methods');
    
    try {
      const methods = this.paymentService.getAvailablePaymentMethods();
      
      this.logger.debug(`Returning ${methods.length} available payment methods`);
      return {
        success: true,
        data: methods,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to get payment methods: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve payment methods',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get payment gateway health status
   * GET /payments/health
   */
  @Get('health')
  getHealthStatus() {
    this.logger.debug('Getting health status');
    
    try {
      const health = this.paymentService.getHealthStatus();
      
      this.logger.debug(`Health status: ${health.status} (${health.healthyProcessors}/${health.totalProcessors} healthy)`);
      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to get health status: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve health status',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get payment processing statistics
   * GET /payments/statistics
   */
  @Get('statistics')
  getStatistics() {
    this.logger.debug('Getting payment statistics');
    
    try {
      const stats = this.paymentService.getStatistics();
      
      this.logger.debug(`Statistics: ${stats.enabledProcessors}/${stats.totalProcessors} processors enabled`);
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve statistics',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Enable a specific payment processor
   * PUT /payments/processors/:bankId/enable
   */
  @Put('processors/:bankId/enable')
  enableProcessor(@Param('bankId') bankId: string) {
    this.logger.log(`Enabling processor: ${bankId}`);
    
    try {
      // Validate bankId
      if (!Object.values(BankId).includes(bankId as BankId)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Invalid bank ID: ${bankId}`,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.paymentService.enableProcessor(bankId as BankId);
      
      this.logger.log(`Successfully enabled processor: ${bankId}`);
      return {
        success: true,
        message: `Processor ${bankId} enabled successfully`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to enable processor ${bankId}: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Disable a specific payment processor
   * PUT /payments/processors/:bankId/disable
   */
  @Put('processors/:bankId/disable')
  disableProcessor(@Param('bankId') bankId: string) {
    this.logger.log(`Disabling processor: ${bankId}`);
    
    try {
      // Validate bankId
      if (!Object.values(BankId).includes(bankId as BankId)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Invalid bank ID: ${bankId}`,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      this.paymentService.disableProcessor(bankId as BankId);
      
      this.logger.log(`Successfully disabled processor: ${bankId}`);
      return {
        success: true,
        message: `Processor ${bankId} disabled successfully`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to disable processor ${bankId}: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get information about a specific processor
   * GET /payments/processors/:bankId
   */
  @Get('processors/:bankId')
  getProcessorInfo(@Param('bankId') bankId: string) {
    this.logger.debug(`Getting processor info for: ${bankId}`);
    
    try {
      // Validate bankId
      if (!Object.values(BankId).includes(bankId as BankId)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Invalid bank ID: ${bankId}`,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const info = this.paymentService.getProcessorInfo(bankId as BankId);
      
      return {
        success: true,
        data: info,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to get processor info for ${bankId}: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Test connectivity to all processors
   * GET /payments/connectivity
   */
  @Get('connectivity')
  async testConnectivity() {
    this.logger.log('Testing processor connectivity');
    
    try {
      const results = await this.paymentService.testConnectivity();
      
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      
      this.logger.log(`Connectivity test completed: ${successCount}/${totalCount} processors responsive`);
      
      return {
        success: true,
        data: {
          summary: {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount
          },
          results
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Connectivity test failed: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Connectivity test failed',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check if a specific bank is available
   * GET /payments/banks/:bankId/available
   */
  @Get('banks/:bankId/available')
  checkBankAvailability(@Param('bankId') bankId: string) {
    this.logger.debug(`Checking availability for bank: ${bankId}`);
    
    try {
      // Validate bankId
      if (!Object.values(BankId).includes(bankId as BankId)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Invalid bank ID: ${bankId}`,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const isAvailable = this.paymentService.isBankAvailable(bankId as BankId);
      
      return {
        success: true,
        data: {
          bankId,
          available: isAvailable,
          status: isAvailable ? 'enabled' : 'disabled'
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to check bank availability for ${bankId}: ${error.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
} 