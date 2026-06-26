import math
from typing import List, Dict, Any

def extract_first_digit(amount: float) -> int:
    """Extrae el primer dígito significativo de un número."""
    if amount == 0:
        return 0
    amount_str = str(abs(amount)).replace('.', '')
    for char in amount_str:
        if char.isdigit() and char != '0':
            return int(char)
    return 0

def check_benford_law(transactions: List[Dict[str, Any]]) -> float:
    """
    Calcula un 'Fraud Probability Score' basado en la desviación de la Ley de Benford.
    Devuelve un score de 0.0 (perfectamente alineado) a 1.0 (alta desviación/sospecha).
    """
    if len(transactions) < 10:
        # No hay suficientes datos para ser estadísticamente significativo
        return 0.5 
        
    counts = {i: 0 for i in range(1, 10)}
    valid_txs = 0
    for tx in transactions:
        amount = tx.get("amount_eur", 0) or tx.get("amount", 0)
        digit = extract_first_digit(amount)
        if 1 <= digit <= 9:
            counts[digit] += 1
            valid_txs += 1
            
    if valid_txs == 0:
        return 0.5
        
    # Distribución teórica de Benford: P(d) = log10(1 + 1/d)
    benford_expected = {d: math.log10(1 + 1/d) for d in range(1, 10)}
    
    # Calcular la divergencia (MAD - Mean Absolute Deviation)
    mad = 0
    for d in range(1, 10):
        actual_freq = counts[d] / valid_txs
        expected_freq = benford_expected[d]
        mad += abs(actual_freq - expected_freq)
        
    mad = mad / 9
    
    # Normalizar MAD a un score de 0 a 1. 
    # Típicamente MAD > 0.015 indica no-conformidad (sospecha).
    fraud_score = min(mad / 0.02, 1.0)
    return fraud_score

def calculate_modified_z_score(financial_summary: Dict[str, Any]) -> float:
    """
    Calcula un Altman Z-Score modificado para microempresas / freelancers.
    Ponderamos liquidez (flujo de caja constante) y rentabilidad.
    """
    avg_monthly = financial_summary.get("avg_monthly_revenue", 0)
    
    # Calculate data points by summing up points across all platforms
    data_points = sum(p.get("data_points", 0) for p in financial_summary.get("platform_breakdown", {}).values())
    if data_points == 0:
        data_points = 52 # Fallback si hay plataformas pero no reportaron data_points

    if avg_monthly == 0 or data_points == 0:
        return 0.0 # Alto riesgo
        
    # Variables simuladas basadas en ingresos crudos
    # T1 = Working Capital / Total Assets (Simulado por liquidez mensual)
    t1 = 0.5  # Asumimos estabilidad media si no hay datos de gastos
    # T2 = Retained Earnings / Total Assets (Crecimiento de ingresos)
    trend = financial_summary.get("growth_trend_signal", "Stable")
    t2 = 0.0
    if "Increasing" in trend:
        t2 = 0.5
    elif "Decreasing" in trend:
        t2 = -0.5
        
    # T3 = EBIT / Total Assets (Margen operativo simulado)
    t3 = 0.2 # Asumido
    
    z_score = 6.56 * t1 + 3.26 * t2 + 6.72 * t3
    return z_score

def analyze_quant_metrics(transactions: List[Dict[str, Any]], financial_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analiza la data usando algoritmos deterministas.
    """
    fraud_score = check_benford_law(transactions)
    z_score = calculate_modified_z_score(financial_summary)
    
    # Interpretación Z-Score
    if z_score > 2.60:
        solvency_zone = "Safe Zone"
    elif 1.1 <= z_score <= 2.60:
        solvency_zone = "Grey Zone"
    else:
        solvency_zone = "Distress Zone"
        
    return {
        "fraud_probability_score": round(fraud_score, 3),
        "benford_analysis": "Normal" if fraud_score < 0.6 else "Anomalous - High Variance",
        "modified_z_score": round(z_score, 2),
        "solvency_zone": solvency_zone
    }
