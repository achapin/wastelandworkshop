import os
import json

def main():
	openfile = open("units.json")
	loadedjson = json.load(openfile)
	for unit in loadedjson:
		if "settlment_mode_slots" in unit:
			del unit['settlment_mode_slots']
		if "heroic" in unit:
			del unit['heroic']
	with open('units.json', 'w') as fp:
		dump = json.dumps(loadedjson, indent=2, sort_keys=True)
		fp.write(dump)


if __name__ == "__main__":
	main()