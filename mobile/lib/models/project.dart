class Project {
  final String id;
  final String name;
  final String? description;
  final String? clientName;
  final double totalBudget;
  final String currency;
  final String status;
  final double companyPercent;
  final double taxPercent;
  final double expenseAmount;
  final double companyAmount;
  final double taxAmount;
  final DateTime? startDate;
  final DateTime? dueDate;

  Project({
    required this.id,
    required this.name,
    this.description,
    this.clientName,
    required this.totalBudget,
    this.currency = 'INR',
    required this.status,
    this.companyPercent = 100.0,
    this.taxPercent = 18.0,
    this.expenseAmount = 0.0,
    required this.companyAmount,
    required this.taxAmount,
    this.startDate,
    this.dueDate,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    final budget = (json['totalBudget'] as num?)?.toDouble() ?? 0.0;
    return Project(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      clientName: json['clientName'],
      totalBudget: budget,
      currency: json['currency'] ?? 'INR',
      status: json['status'] ?? 'ACTIVE',
      companyPercent: (json['companyPercent'] as num?)?.toDouble() ?? 100.0,
      taxPercent: (json['taxPercent'] as num?)?.toDouble() ?? 18.0,
      expenseAmount: (json['expenseAmount'] as num?)?.toDouble() ?? 0.0,
      companyAmount: (json['companyAmount'] as num?)?.toDouble() ?? budget,
      taxAmount: (json['taxAmount'] as num?)?.toDouble() ?? 0.0,
      startDate: json['startDate'] != null ? DateTime.tryParse(json['startDate']) : null,
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate']) : null,
    );
  }
}

class TreasurySummary {
  final double totalRevenue;
  final double companyVault;
  final double taxReserves;
  final double totalExpenses;

  TreasurySummary({
    required this.totalRevenue,
    required this.companyVault,
    required this.taxReserves,
    required this.totalExpenses,
  });

  factory TreasurySummary.fromJson(Map<String, dynamic> json) {
    return TreasurySummary(
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
      companyVault: (json['companyVault'] as num?)?.toDouble() ?? 0.0,
      taxReserves: (json['taxReserves'] as num?)?.toDouble() ?? 0.0,
      totalExpenses: (json['totalExpenses'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
