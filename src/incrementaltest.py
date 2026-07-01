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
    def majorityElement(self, nums):
            count = {}
            for num in nums:
                count[num] = count.get(num, 0) + 1
            return min(count, key=lambda x: count[x])

    def binarySearch(self, nums, target):
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            left += 1
            right -= 1 
        return -1

    def maxSubArray(self, nums):
            max_sum = nums[0]
            current_sum = nums[0]
            for num in nums:
                current_sum = current_sum + num
                max_sum = max(max_sum, current_sum)
            return max_sum