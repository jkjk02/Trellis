#!/usr/bin/env python3
"""
Real-time channel monitor — watch worker progress in terminal.

Usage:
  python .trellis/scripts/monitor_channel.py <channel-name>
  python .trellis/scripts/monitor_channel.py <channel-name> --follow

Examples:
  python .trellis/scripts/monitor_channel.py user-profile-feature
  python .trellis/scripts/monitor_channel.py user-profile-feature --follow
"""

import subprocess
import sys
import time
from pathlib import Path


def monitor_channel(channel_name: str, follow: bool = False):
    """Monitor channel messages, optionally following new events."""

    if follow:
        print(f"📡 Monitoring channel '{channel_name}' (Ctrl+C to exit)...\n")
        seen_lines = set()

        try:
            while True:
                result = subprocess.run(
                    ["trellis", "channel", "messages", channel_name],
                    capture_output=True,
                    text=True,
                    check=False,
                )

                if result.returncode != 0:
                    print(f"❌ Error: {result.stderr}")
                    sys.exit(1)

                lines = result.stdout.strip().split("\n")
                new_lines = [line for line in lines if line not in seen_lines]

                for line in new_lines:
                    print(line)
                    seen_lines.add(line)

                time.sleep(2)  # Poll every 2 seconds

        except KeyboardInterrupt:
            print("\n\n✅ Monitoring stopped.")
            sys.exit(0)

    else:
        # One-shot display
        result = subprocess.run(
            ["trellis", "channel", "messages", channel_name],
            check=False,
        )
        sys.exit(result.returncode)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    channel_name = sys.argv[1]
    follow = "--follow" in sys.argv or "-f" in sys.argv

    monitor_channel(channel_name, follow)


if __name__ == "__main__":
    main()
