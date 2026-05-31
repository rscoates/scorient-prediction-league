# A simple script to count the number of games in each round of the World Cup
import json

def main():
    # Initialize a dictionary to count the number of games in each round
    round_counts = {}
    # Load the World Cup data from the JSON file
    with open('worldcup2026.json', 'r') as f:
        data = json.load(f)
        # Iterate through each match in the data
        for match in data['matches']:
            # Get the round of the match
            round_name = match['round']
            # Group all of the rounds that start with "Matchday" into a single "Group" category
            if round_name.startswith('Matchday'):
                round_name = 'Group'
            # Increment the count for this round
            if round_name in round_counts:
                round_counts[round_name] += 1
            else:
                round_counts[round_name] = 1
    return round_counts

if __name__ == "__main__":
    round_counts = main()
    # Print the number of games in each round
    for round_name, count in round_counts.items():
        print(f"{round_name}: {count} games")