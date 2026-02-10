import numpy as np
from scipy import stats
from dataclasses import dataclass
from typing import Dict, Optional
from src.core.logging_config import LoggerMixin

@dataclass
class MertonModelInput:
    asset_value: float
    debt_face_value: float
    risk_free_rate: float
    volatility: float
    time_to_maturity: float

class CreditRiskService(LoggerMixin):
    """
    Implements structural credit risk models, primarily the Merton Model.
    """
    
    def calculate_merton_model(self, inputs: MertonModelInput) -> Dict[str, float]:
        """
        Calculate Probability of Default (PD) and Distance to Default (DD)
        using the Merton (1974) structural model.
        """
        try:
            V = inputs.asset_value
            D = inputs.debt_face_value
            r = inputs.risk_free_rate
            sigma = inputs.volatility
            T = inputs.time_to_maturity
            
            if V <= 0 or D < 0 or T <= 0 or sigma <= 0:
                raise ValueError("Invalid input parameters: Asset value, time, and volatility must be positive.")
            
            # Calculate d1 and d2
            numerator = np.log(V / D) + (r + 0.5 * sigma ** 2) * T
            denominator = sigma * np.sqrt(T)
            
            d1 = numerator / denominator
            d2 = d1 - denominator
            
            # Probability of Default (N(-d2))
            measure_pd = stats.norm.cdf(-d2)
            
            # Distance to Default (DD)
            # Often approximated as simply d2 (number of standard deviations asset value is from default point)
            distance_to_default = d2
            
            # Value of Equity (Call Option on Assets)
            equity_value = V * stats.norm.cdf(d1) - D * np.exp(-r * T) * stats.norm.cdf(d2)
            
            # Value of Debt
            debt_value = V - equity_value
            
            return {
                "probability_of_default": round(float(measure_pd), 6),
                "distance_to_default": round(float(distance_to_default), 4),
                "equity_value": round(float(equity_value), 2),
                "debt_value": round(float(debt_value), 2),
                "implied_credit_spread": round(float(-(1/T) * np.log(debt_value/D) - r), 6)
            }
            
        except Exception as e:
            self.logger.error(f"Error in Merton Model calculation: {str(e)}")
            raise
