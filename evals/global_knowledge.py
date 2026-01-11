import pandas as pd
from inspect_ai import Task, task, eval
from inspect_ai.dataset import Sample, MemoryDataset
from inspect_ai.scorer import scorer, Target, Score, accuracy
from inspect_ai.solver import generate, system_message

MODEL_NAME = "openai/gpt-5.2" # User requested standard logic

# 1. Load Ground Truth
def load_dataset():
    df = pd.read_csv("data/ground_truth.csv")
    samples = []
    for _, row in df.iterrows():
        samples.append(
            Sample(
                input=f"What was the GDP of {row['country']} in {row['year']}? Return ONLY the number in USD. Do not use scientific notation. Example: 10000000000.",
                target=str(row['gdp_usd']),
                metadata={
                    "country": row['country'],
                    "year": row['year'],
                    "metric": "gdp_usd",
                    "actual_value": row['gdp_usd']
                }
            )
        )
    return MemoryDataset(samples)

# 2. Define Custom Scorer
@scorer(metrics=[accuracy()])
def mpe_scorer():
    async def score(state, target):
        # Mean Percentage Error
        try:
            # Clean output rigidly
            raw_output = state.output.completion.strip()
            # Remove common currency symbols and words
            clean_output = raw_output.lower().replace("$", "").replace("usd", "").replace(",", "").replace(" ", "")
            
            prediction = float(clean_output)
            actual = float(target.text)
            
            error = abs(prediction - actual)
            percent_error = error / actual if actual != 0 else 0.0
            
            # Simple threshold for accuracy metric, but we care mostly about the percent_error value
            is_accurate = percent_error < 0.05
            
            return Score(
                value=percent_error, # We store the error rate as the primary value for the heatmap
                answer=str(prediction),
                explanation=f"Predicted: {prediction:,.0f}, Actual: {actual:,.0f}, Error: {percent_error:.2%}"
            )
        except ValueError:
            return Score(
                value=1.0, # Max error for invalid format
                answer=state.output.completion,
                explanation=f"Could not parse number from output: '{state.output.completion}'"
            )
    return score

# 3. Define Task
@task
def country_knowledge():
    return Task(
        dataset=load_dataset(),
        plan=[
            system_message("You are a precise statistical database. You reply ONLY with raw numbers. No markdown, no text."),
            generate(),
        ],
        scorer=mpe_scorer(),
    )

if __name__ == "__main__":
    # This block allows running directly with `python global_knowledge.py` if needed,
    # but `inspect eval` is the preferred way.
    print("Run with: inspect eval global_knowledge.py --model openai/gpt-5.2")

