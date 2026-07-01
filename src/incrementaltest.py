class Solution:
    def twoSum(self, nums, target):
        mapp = {}

        for num in nums:
            if target - num in mapp:
                return [num, mapp[target - num]
            mapp[num] = num

    def maxProduct(self, nums):
            max_prod = nums[0]
            min_prod = nums[0]
            result = nums[0]

            for i in range(1, len(nums) - 1):
                num = nums[i]
                max_prod, min_prod = max(num, max_prod * num, min_prod * num), min(num, max_prod * num, min_prod * num)
                result = max(result, max_prod)

            return result
    def isPalindrome(self, s):
        s = ''.join(c.lower() for c in s if c.isalnum())
        left, right = 0, len(s) - 1

        while left < right:
            if s[left] != s[right]:
                return False
            left += 1
            right += 1  