"""Promo codes give a paid plan once, case-insensitively, and never a downgrade."""
from types import SimpleNamespace as NS

import pytest

from app.services.promo_service import apply_promo, normalize_code


def test_codes_are_case_insensitive():
    assert normalize_code("  solvai-judges ") == "SOLVAI-JUDGES"


def test_apply_gives_the_plan_for_a_year_and_counts_the_use():
    org, promo = NS(plan="free", status=None, current_period_end=None), NS(plan="pro", uses_count=4)
    apply_promo(org, promo)
    assert (org.plan, org.status, promo.uses_count) == ("pro", "active", 5)
    assert org.current_period_end is not None


@pytest.mark.parametrize("current", ["pro", "business"])
def test_never_replaces_an_equal_or_better_plan(current):
    org, promo = NS(plan=current), NS(plan="pro", uses_count=0)
    with pytest.raises(ValueError, match="already includes"):
        apply_promo(org, promo)
    assert org.plan == current and promo.uses_count == 0
