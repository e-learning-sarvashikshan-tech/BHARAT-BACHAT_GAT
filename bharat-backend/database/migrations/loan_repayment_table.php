<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('loan_repayments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('loan_id')
                  ->constrained('loans')
                  ->onDelete('cascade');

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->foreignId('group_id')
                  ->constrained('groups')
                  ->onDelete('cascade');

            $table->decimal('amount', 10, 2);               // Repayment amount
            $table->decimal('principal_amount', 10, 2);     // Principal part
            $table->decimal('interest_amount', 10, 2);      // Interest part
            $table->decimal('penalty_amount', 10, 2)->default(0); // Late fine

            $table->date('due_date');                        // When payment is due
            $table->date('paid_date')->nullable();           // When actually paid

            $table->enum('status', [
                'pending',
                'paid',
                'overdue',
                'partial'
            ])->default('pending');

            $table->string('payment_method')->nullable();    // cash, upi, bank
            $table->string('transaction_reference')->nullable(); // UPI/bank ref no
            $table->text('notes')->nullable();               // Any remarks

            $table->foreignId('recorded_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');                    // Admin who recorded it

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_repayments');
    }
};